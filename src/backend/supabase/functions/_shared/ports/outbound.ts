// What the functions' logic needs from the database; the adapters implement these with the project's secret
// key, and nothing else of the logic reaches the database.

import type { Protocol, Result } from './types.ts';

/**
 * Where the servers are kept. Each finds its row or inserts it, so storing an address twice changes nothing;
 * an error with the database's message when it could not.
 */
export interface ServerStore {
  /** The id of the identity. */
  identity(identity: string): Promise<Result<string>>;
  /** The id of the host. */
  host(host: string): Promise<Result<string>>;
  /** Stores the server of that protocol, host and identity. */
  server(protocol: Protocol, hostId: string, identityId: string): Promise<Result<void>>;
}

/** Where the bots are kept. */
export interface BotStore {
  /** Stores the bot's address, not approved; an error with the database's message when it could not. */
  insert(address: string): Promise<Result<void>>;
}

/** Where the relays are kept. */
export interface RelayStore {
  /** Stores the relay's address; an error with the database's message when it could not. */
  insert(url: string): Promise<Result<void>>;
}
