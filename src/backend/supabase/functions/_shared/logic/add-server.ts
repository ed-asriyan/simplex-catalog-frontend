// The logic of the `add-server` function: it turns the body of a request into the answer, over the server store
// (US-B43…US-B47). An address of several hosts is a server for each, of one identity, and storing an address
// twice changes nothing, because the store finds a row before it inserts one.
//
// An address is `smp://` or `xftp://`, then the identity, `@` and the comma-separated hosts, each with an
// optional port that stays part of the host. The scheme is matched in any case but only the lower-case one names
// a protocol. A store failure answers with the status of the step that failed: 3 the identity, 4 a host, 5 a
// server; the hosts already stored stay, which is harmless because adding the address again finds them.

import type { AddServer } from '../ports/inbound.ts';
import type { ServerStore } from '../ports/outbound.ts';
import type { Answer, Protocol } from '../ports/types.ts';

const ADDRESS =
  /^(smp|xftp):\/\/([A-Za-z0-9\-\–_+=:]+)@((?:\[[\da-fA-F:]+\](?::\d{1,5})?|[A-Za-z0-9.-]+(?::\d{1,5})?|[\da-fA-F:]+)(?:,(?:\[[\da-fA-F:]+\](?::\d{1,5})?|[A-Za-z0-9.-]+(?::\d{1,5})?|[\da-fA-F:]+))*)$/i;

const PROTOCOLS: Record<string, Protocol> = { smp: 1, xftp: 2 };

const failed = (status: 3 | 4 | 5, error: string): Answer => ({ http: 500, body: { status, error } });

export class AddServerLogic implements AddServer {
  constructor(private readonly store: ServerStore) {}

  async add(body: unknown): Promise<Answer> {
    const uri = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).uri : undefined;
    if (!uri) return { http: 400, body: { error: 'Missing uri' } };

    const match = typeof uri === 'string' ? uri.match(ADDRESS) : null;
    if (!match) return { http: 400, body: { status: 1, error: 'Invalid URI format' } };
    const [, scheme, identity, hosts] = match;

    const protocol = PROTOCOLS[scheme];
    if (!protocol) return { http: 400, body: { status: 2, error: `Unknown protocol: ${scheme}` } };

    const identityId = await this.store.identity(identity);
    if (!identityId.ok) return failed(3, identityId.error);

    for (const host of hosts.split(',')) {
      const hostId = await this.store.host(host);
      if (!hostId.ok) return failed(4, hostId.error);
      const server = await this.store.server(protocol, hostId.value, identityId.value);
      if (!server.ok) return failed(5, server.error);
    }
    return { http: 204 };
  }
}
