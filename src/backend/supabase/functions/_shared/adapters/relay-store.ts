// The relay store over the database's table `relays`; a duplicate address (Postgres 23505) is a no-op.

import type { RelayStore } from '../ports/outbound.ts';
import type { Result } from '../ports/types.ts';
import { attempt, type Database, failed } from './supabase.ts';

export class SupabaseRelayStore implements RelayStore {
  constructor(private readonly db: Database) {}

  insert(url: string): Promise<Result<void>> {
    return attempt('relays', async () => {
      const { error } = await this.db.from('relays').insert({ url });
      if (error && error.code !== '23505') return failed('relays', error);
      return { ok: true, value: undefined };
    });
  }
}
