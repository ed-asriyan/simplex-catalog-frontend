// The bot store over the database's table `bots`: a bot is inserted by its address and is not approved, which is
// the table's default; a duplicate address (Postgres 23505) is a no-op.

import type { BotStore } from '../ports/outbound.ts';
import type { Result } from '../ports/types.ts';
import { attempt, type Database, failed } from './supabase.ts';

export class SupabaseBotStore implements BotStore {
  constructor(private readonly db: Database) {}

  insert(address: string): Promise<Result<void>> {
    return attempt('bots', async () => {
      const { error } = await this.db.from('bots').insert({ address });
      if (error && error.code !== '23505') return failed('bots', error);
      return { ok: true, value: undefined };
    });
  }
}
