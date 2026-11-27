// What the functions' logic does with the body of a request, one interface per function. Each function's HTTP
// handler (`<function>/index.ts`: CORS, the method, JSON) calls its port and puts the answer on the wire, and
// does nothing else; the logic implements these over the outbound ports.

import type { Answer } from './types.ts';

/** Adds a server's address to the catalog (US-B43…US-B47). */
export interface AddServer {
  /**
   * `body` is the request's JSON, of any shape: one that is not an object is answered as one without the field. Answers 204 when the servers of the address are stored or were there (an
   * address of several hosts is a server for each, of one identity); 400 `{ error: 'Missing uri' }` without a
   * `uri`; 400 `{ status: 1, error: 'Invalid URI format' }` for an address that is not `smp://` or `xftp://`,
   * an identity and hosts; and 500 `{ status: 3 | 4 | 5, error }` with the database's message when the
   * identity, a host or a server could not be stored.
   */
  add(body: unknown): Promise<Answer>;
}

/** Adds a bot's address to the catalog, not approved (US-C16…US-C21). */
export interface AddBot {
  /**
   * `body` is the request's JSON, of any shape: one that is not an object is answered as one without the field. Answers 204 when the address is stored; 400 `{ error: 'Missing url' }`
   * without a `url`; 400 `{ status, error }` for an address that is not a bot's: 1 not a URL, 2 not HTTPS,
   * 4 on `localhost`, 6 a short link whose fragment is not a key of 32 bytes or a full address without its
   * SMP server, 3 a group's link or any other path; and 500 `{ status: 3, error }` with the database's
   * message when it could not be stored, an address already there among them.
   */
  add(body: unknown): Promise<Answer>;
}

/** Adds a relay's address to the catalog (US-D17…US-D21). */
export interface AddRelay {
  /**
   * `body` is the request's JSON, of any shape: one that is not an object is answered as one without the field. Answers 204 when the address is stored; 400 `{ error: 'Missing url' }`
   * without a `url`; 400 `{ status, error }` for an address that is not a relay's: 1 not a URL, 2 not HTTPS,
   * 3 a path other than `/r`, 6 a port in its host part, a query, or a key, host, port or certificate that
   * cannot be read, 4 `localhost` among its hosts; and 500 `{ status: 3, error }` with the database's message
   * when it could not be stored, an address already there among them.
   */
  add(body: unknown): Promise<Answer>;
}
