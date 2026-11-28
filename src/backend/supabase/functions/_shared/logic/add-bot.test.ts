import { assertEquals } from 'jsr:@std/assert@1';
import type { BotStore } from '../ports/outbound.ts';
import type { Answer, Result } from '../ports/types.ts';
import { AddBotLogic } from './add-bot.ts';

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const KEY = b64url(new Uint8Array(32).fill(7));
const SHORT = `https://smp.example.com/a#${KEY}`;
const FULL = 'https://simplex.chat/contact#/?v=2-7&smp=' + encodeURIComponent('smp://abc@smp.example.com/key');

/** In-memory bot store: a duplicate address does nothing. */
class FakeBotStore implements BotStore {
  addresses: string[] = [];
  failWith: string | null = null;

  insert(address: string): Promise<Result<void>> {
    if (this.failWith) return Promise.resolve({ ok: false, error: this.failWith });
    if (!this.addresses.includes(address)) {
      this.addresses.push(address);
    }
    return Promise.resolve({ ok: true, value: undefined });
  }
}

const setup = () => {
  const store = new FakeBotStore();
  return { store, logic: new AddBotLogic(store) };
};

const refused = (status: number, error: string): Answer => ({ http: 400, body: { status, error } });
const NOT_BOT = refused(3, 'URL is not a bot address');
const CONTACT = refused(6, 'URL has invalid format. Invalid contact data.');

// US-C20
Deno.test('add-bot: no url is a 400 Missing url', async () => {
  const { store, logic } = setup();
  for (const body of [{}, { url: '' }, null, undefined]) {
    assertEquals(await logic.add(body), { http: 400, body: { error: 'Missing url' } });
  }
  assertEquals(store.addresses, []);
});

// US-C17
Deno.test('add-bot: a short link and a full address are stored exactly as given', async () => {
  for (const url of [SHORT, FULL]) {
    const { store, logic } = setup();
    assertEquals(await logic.add({ url }), { http: 204 });
    assertEquals(store.addresses, [url]);
  }
});

// US-C20
Deno.test('add-bot: what is not a URL is a 400 with status 1', async () => {
  const { store, logic } = setup();
  assertEquals(await logic.add({ url: 'not a url' }), refused(1, 'Invalid URL format'));
  assertEquals(store.addresses, []);
});

// US-C20
Deno.test('add-bot: a URL that is not HTTPS is a 400 with status 2', async () => {
  const { store, logic } = setup();
  assertEquals(
    await logic.add({ url: `http://smp.example.com/a#${KEY}` }),
    refused(2, 'URL has invalid format. Schema must be HTTPS'),
  );
  assertEquals(store.addresses, []);
});

// US-C20
Deno.test('add-bot: localhost is a 400 with status 4', async () => {
  const { store, logic } = setup();
  assertEquals(await logic.add({ url: `https://localhost/a#${KEY}` }), refused(4, 'Hostname is not allowed'));
  assertEquals(await logic.add({ url: `https://LOCALHOST/a#${KEY}` }), refused(4, 'Hostname is not allowed'));
  assertEquals(store.addresses, []);
});

// US-C20
Deno.test('add-bot: a group\'s link and any other path is a 400 with status 3', async () => {
  const { store, logic } = setup();
  const group = 'https://simplex.chat/contact#/?v=2-7&data=' + encodeURIComponent('{"groupLinkId":"abc"}') +
    '&smp=' + encodeURIComponent('smp://abc@smp.example.com');
  assertEquals(await logic.add({ url: group }), NOT_BOT);
  assertEquals(await logic.add({ url: 'https://smp.example.com' }), NOT_BOT);
  assertEquals(await logic.add({ url: 'https://smp.example.com/g#abc' }), NOT_BOT);
  assertEquals(store.addresses, []);
});

// US-C18, US-C20
Deno.test('add-bot: a short link whose key is not 32 bytes, or has anything after it, is a 400 with status 6', async () => {
  const { store, logic } = setup();
  assertEquals(await logic.add({ url: `https://smp.example.com/a#${b64url(new Uint8Array(16))}` }), CONTACT);
  assertEquals(await logic.add({ url: 'https://smp.example.com/a' }), CONTACT);
  assertEquals(await logic.add({ url: `https://smp.example.com/a#${KEY}?c=abc` }), CONTACT);
  assertEquals(store.addresses, []);
});

// US-C20
Deno.test('add-bot: a full address without its SMP server is a 400 with status 6', async () => {
  const { store, logic } = setup();
  assertEquals(await logic.add({ url: 'https://simplex.chat/contact#/?v=2-7' }), CONTACT);
  assertEquals(await logic.add({ url: 'https://simplex.chat/contact#/?v=2-7&smp=' + encodeURIComponent('https://x.example.com') }), CONTACT);
  assertEquals(store.addresses, []);
});

// US-C19
Deno.test('add-bot: an address stored twice is a 204 and changes nothing', async () => {
  const { store, logic } = setup();
  assertEquals(await logic.add({ url: SHORT }), { http: 204 });
  assertEquals(await logic.add({ url: SHORT }), { http: 204 });
  assertEquals(store.addresses, [SHORT]);
});

// US-C17
Deno.test('add-bot: a store that fails is a 500 with status 3 and its message', async () => {
  const { store, logic } = setup();
  store.failWith = 'database down';
  assertEquals(await logic.add({ url: SHORT }), { http: 500, body: { status: 3, error: 'database down' } });
});
