import { assertEquals } from 'jsr:@std/assert@1';
import type { ServerStore } from '../ports/outbound.ts';
import type { Answer, Protocol, Result } from '../ports/types.ts';
import { AddServerLogic } from './add-server.ts';

const KEY = '64jc_Sfg93KT6jSkJV7slVswcWNyNpz5uQ_gQlwQp5E';

/** In-memory server store: rows are found before they are inserted; `failOn` makes one step fail. */
class FakeServerStore implements ServerStore {
  identities = new Map<string, string>();
  hosts = new Map<string, string>();
  servers: { protocol: Protocol; host: string; identity: string }[] = [];
  failOn: 'identity' | 'host' | 'server' | null = null;

  private id(map: Map<string, string>, key: string): string {
    if (!map.has(key)) map.set(key, `id-${map.size + 1}`);
    return map.get(key)!;
  }
  private keyOf(map: Map<string, string>, id: string): string {
    return [...map].find(([, v]) => v === id)![0];
  }

  identity(identity: string): Promise<Result<string>> {
    if (this.failOn === 'identity') return Promise.resolve({ ok: false, error: 'identity store down' });
    return Promise.resolve({ ok: true, value: this.id(this.identities, identity) });
  }
  host(host: string): Promise<Result<string>> {
    if (this.failOn === 'host') return Promise.resolve({ ok: false, error: 'host store down' });
    return Promise.resolve({ ok: true, value: this.id(this.hosts, host) });
  }
  server(protocol: Protocol, hostId: string, identityId: string): Promise<Result<void>> {
    if (this.failOn === 'server') return Promise.resolve({ ok: false, error: 'server store down' });
    const host = this.keyOf(this.hosts, hostId);
    const identity = this.keyOf(this.identities, identityId);
    if (!this.servers.some((s) => s.protocol === protocol && s.host === host && s.identity === identity)) {
      this.servers.push({ protocol, host, identity });
    }
    return Promise.resolve({ ok: true, value: undefined });
  }
}

const setup = () => {
  const store = new FakeServerStore();
  return { store, logic: new AddServerLogic(store) };
};

const invalid: Answer = { http: 400, body: { status: 1, error: 'Invalid URI format' } };

// US-B47
Deno.test('add-server: no uri is a 400 Missing uri', async () => {
  const { store, logic } = setup();
  for (const body of [{}, { uri: '' }, null, undefined]) {
    assertEquals(await logic.add(body), { http: 400, body: { error: 'Missing uri' } });
  }
  assertEquals(store.servers, []);
});

// US-B47
Deno.test('add-server: an address that is not a SMP or XFTP server\'s is a 400 with status 1', async () => {
  const { store, logic } = setup();
  for (const uri of ['https://smp.example.com', 'smp://smp.example.com', 'ftp://k@smp.example.com', 'not a uri']) {
    assertEquals(await logic.add({ uri }), invalid, uri);
  }
  assertEquals(store.servers, []);
});

// US-B44
Deno.test('add-server: a SMP address is stored with protocol 1, its host and identity', async () => {
  const { store, logic } = setup();
  assertEquals(await logic.add({ uri: `smp://${KEY}@smp.example.com` }), { http: 204 });
  assertEquals(store.servers, [{ protocol: 1, host: 'smp.example.com', identity: KEY }]);
});

// US-B44
Deno.test('add-server: an XFTP address is stored with protocol 2, and a port stays in the host', async () => {
  const { store, logic } = setup();
  assertEquals(await logic.add({ uri: `xftp://${KEY}@xftp.example.com:443` }), { http: 204 });
  assertEquals(store.servers, [{ protocol: 2, host: 'xftp.example.com:443', identity: KEY }]);
});

// US-B45
Deno.test('add-server: an address of several hosts is a server for each, of one identity', async () => {
  const { store, logic } = setup();
  assertEquals(await logic.add({ uri: `smp://${KEY}@smp.example.com,abcdefghijklmnop.onion` }), { http: 204 });
  assertEquals(store.servers, [
    { protocol: 1, host: 'smp.example.com', identity: KEY },
    { protocol: 1, host: 'abcdefghijklmnop.onion', identity: KEY },
  ]);
  assertEquals(store.identities.size, 1);
});

// US-B46
Deno.test('add-server: an address stored twice is a 204 and changes nothing', async () => {
  const { store, logic } = setup();
  const uri = `smp://${KEY}@smp.example.com,abcdefghijklmnop.onion`;
  assertEquals(await logic.add({ uri }), { http: 204 });
  const servers = structuredClone(store.servers);
  assertEquals(await logic.add({ uri }), { http: 204 });
  assertEquals(store.servers, servers);
  assertEquals(store.identities.size, 1);
  assertEquals(store.hosts.size, 2);
});

// US-B44 (the 500 of the answer is in the inbound port's doc)
Deno.test('add-server: a store that fails is a 500 with its status and message', async () => {
  const cases = [['identity', 3], ['host', 4], ['server', 5]] as const;
  for (const [step, status] of cases) {
    const { store, logic } = setup();
    store.failOn = step;
    assertEquals(
      await logic.add({ uri: `smp://${KEY}@smp.example.com` }),
      { http: 500, body: { status, error: `${step} store down` } },
      step,
    );
    assertEquals(store.servers, []);
  }
});
