import { assertEquals } from 'jsr:@std/assert@1';
import type { RelayStore } from '../ports/outbound.ts';
import type { Answer, Result } from '../ports/types.ts';
import { AddRelayLogic } from './add-relay.ts';

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const KEY = b64url(new Uint8Array(32).fill(7));
const FINGERPRINT = b64url(new Uint8Array(32).fill(9));
const SHORT = `https://smp.example.com/r#${KEY}`;
const FULL = `${SHORT}?h=abcdefghijklmnop.onion&p=5223&c=${FINGERPRINT}`;

/** In-memory relay store: a duplicate address fails with the database's message. */
class FakeRelayStore implements RelayStore {
  urls: string[] = [];
  failWith: string | null = null;

  insert(url: string): Promise<Result<void>> {
    if (this.failWith) return Promise.resolve({ ok: false, error: this.failWith });
    if (this.urls.includes(url)) {
      return Promise.resolve({ ok: false, error: 'duplicate key value violates unique constraint "relays_url_key"' });
    }
    this.urls.push(url);
    return Promise.resolve({ ok: true, value: undefined });
  }
}

const setup = () => {
  const store = new FakeRelayStore();
  return { store, logic: new AddRelayLogic(store) };
};

const refused = (status: number, error: string): Answer => ({ http: 400, body: { status, error } });
const NOT_RELAY = refused(3, 'URL is not a relay address');
const CONTACT = refused(6, 'URL has invalid format. Invalid contact data.');

// US-D20
Deno.test('add-relay: no url is a 400 Missing url', async () => {
  const { store, logic } = setup();
  for (const body of [{}, { url: '' }, null, undefined]) {
    assertEquals(await logic.add(body), { http: 400, body: { error: 'Missing url' } });
  }
  assertEquals(store.urls, []);
});

// US-D18
Deno.test('add-relay: a short link, with or without its other hosts, port and certificate, is stored exactly as given', async () => {
  for (const url of [SHORT, FULL]) {
    const { store, logic } = setup();
    assertEquals(await logic.add({ url }), { http: 204 });
    assertEquals(store.urls, [url]);
  }
});

// US-D20
Deno.test('add-relay: what is not a URL is a 400 with status 1', async () => {
  const { store, logic } = setup();
  assertEquals(await logic.add({ url: 'not a url' }), refused(1, 'Invalid URL format'));
  assertEquals(store.urls, []);
});

// US-D20
Deno.test('add-relay: a URL that is not HTTPS is a 400 with status 2', async () => {
  const { store, logic } = setup();
  assertEquals(
    await logic.add({ url: `http://smp.example.com/r#${KEY}` }),
    refused(2, 'URL has invalid format. Schema must be HTTPS'),
  );
  assertEquals(store.urls, []);
});

// US-D20
Deno.test('add-relay: a path other than /r is a 400 with status 3', async () => {
  const { store, logic } = setup();
  assertEquals(await logic.add({ url: `https://smp.example.com/a#${KEY}` }), NOT_RELAY);
  assertEquals(await logic.add({ url: 'https://smp.example.com' }), NOT_RELAY);
  assertEquals(store.urls, []);
});

// US-D20
Deno.test('add-relay: a port in the host part, a query, or a key, host, port or certificate that cannot be read is a 400 with status 6', async () => {
  const { store, logic } = setup();
  const urls = [
    `https://smp.example.com:5223/r#${KEY}`,
    `https://smp.example.com/r?x=1#${KEY}`,
    'https://smp.example.com/r',
    `https://smp.example.com/r#${b64url(new Uint8Array(16))}`,
    `${SHORT}?h=bad:host:with;junk`,
    `${SHORT}?p=70000`,
    `${SHORT}?p=abc`,
    `${SHORT}?c=${b64url(new Uint8Array(16))}`,
  ];
  for (const url of urls) assertEquals(await logic.add({ url }), CONTACT, url);
  assertEquals(store.urls, []);
});

// US-D20
Deno.test('add-relay: localhost among its hosts is a 400 with status 4', async () => {
  const { store, logic } = setup();
  assertEquals(await logic.add({ url: `https://localhost/r#${KEY}` }), refused(4, 'Hostname is not allowed'));
  assertEquals(await logic.add({ url: `${SHORT}?h=localhost` }), refused(4, 'Hostname is not allowed'));
  assertEquals(store.urls, []);
});

// US-D19
Deno.test('add-relay: an address stored twice is a 500 with the database\'s message', async () => {
  const { store, logic } = setup();
  assertEquals(await logic.add({ url: SHORT }), { http: 204 });
  assertEquals(await logic.add({ url: SHORT }), {
    http: 500,
    body: { status: 3, error: 'duplicate key value violates unique constraint "relays_url_key"' },
  });
  assertEquals(store.urls, [SHORT]);
});

// US-D19
Deno.test('add-relay: a store that fails is a 500 with status 3 and its message', async () => {
  const { store, logic } = setup();
  store.failWith = 'database down';
  assertEquals(await logic.add({ url: SHORT }), { http: 500, body: { status: 3, error: 'database down' } });
});
