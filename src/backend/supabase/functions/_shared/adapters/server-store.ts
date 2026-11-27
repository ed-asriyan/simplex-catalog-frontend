// The server store over the database's tables `server_identities`, `server_hosts` and `servers`.

import type { ServerStore } from '../ports/outbound.ts';
import type { Protocol, Result } from '../ports/types.ts';
import { attempt, type Database, failed } from './supabase.ts';

export class SupabaseServerStore implements ServerStore {
  constructor(private readonly db: Database) {}

  identity(identity: string): Promise<Result<string>> {
    return attempt('server_identities', async () => {
      const found = await this.db.from('server_identities').select('uuid').eq('identity', identity).maybeSingle();
      if (found.error) return failed('server_identities', found.error);
      if (found.data?.uuid) return { ok: true, value: found.data.uuid as string };

      const made = await this.db.from('server_identities').insert({ identity }).select('uuid').single();
      return made.error ? failed('server_identities', made.error) : { ok: true, value: made.data.uuid as string };
    });
  }

  host(host: string): Promise<Result<string>> {
    return attempt('server_hosts', async () => {
      const found = await this.db.from('server_hosts').select('uuid').eq('host', host).maybeSingle();
      if (found.error) return failed('server_hosts', found.error);
      if (found.data?.uuid) return { ok: true, value: found.data.uuid as string };

      const made = await this.db.from('server_hosts').insert({ host }).select('uuid').single();
      return made.error ? failed('server_hosts', made.error) : { ok: true, value: made.data.uuid as string };
    });
  }

  server(protocol: Protocol, hostId: string, identityId: string): Promise<Result<void>> {
    return attempt('servers', async () => {
      const found = await this.db.from('servers').select('uuid').eq('protocol', protocol).eq('host_uuid', hostId)
        .eq('identity_uuid', identityId).maybeSingle();
      if (found.error) return failed('servers', found.error);
      if (found.data?.uuid) return { ok: true, value: undefined };

      const { error } = await this.db.from('servers').insert({
        protocol,
        host_uuid: hostId,
        identity_uuid: identityId,
      });
      return error ? failed('servers', error) : { ok: true, value: undefined };
    });
  }
}
