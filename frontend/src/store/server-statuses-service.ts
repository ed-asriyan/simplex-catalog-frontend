import type { SupabaseClient } from '@supabase/supabase-js';
import type { ServerStatusesStore, ServerStatus } from './server-statuses-store';

const parseServerStatus = function (data: any): ServerStatus {
    return {
        uuid: data.uuid,
        serverUuid: data.server_uuid,
        country: data.country,
        status: data.status,
        infoPageAvailable: data['info_page_available'],
        createdAt: new Date(data['created_at']),
    };
};

export class ServerStatusesService {
    private readonly store: ServerStatusesStore;
    private readonly client: SupabaseClient;

    constructor(client: SupabaseClient, store: ServerStatusesStore) {
        this.store = store;
        this.client = client;
    }

    async fetch(serverUuids: string[]) {
      let query = this.client.from('server_status').select('*');

      query = query.in('server_uuid', serverUuids);
      query = query.order('created_at', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;

      this.store.addOrUpdate(...data.map(parseServerStatus));
  };
}
