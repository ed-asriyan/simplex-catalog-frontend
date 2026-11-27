// The relay store over the database's table `relays`.

import type { RelayStore } from '../ports/outbound.ts';
import type { Result } from '../ports/types.ts';
import { attempt, type Database, failed } from './supabase.ts';

export class SupabaseRelayStore implements RelayStore {
  constructor(private readonly db: Database) {}

  insert(url: string): Promise<Result<void>> {
    return attempt('relays', async () => {
      const { error } = await this.db.from('relays').insert({ url });
      return error ? failed('relays', error) : { ok: true, value: undefined };
    });
  }
}
