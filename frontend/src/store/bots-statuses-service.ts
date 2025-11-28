import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { type BotStatus, type BotStatusesStore, botsStatusesStore } from './bots-statuses-store';

const parseBotStatus = function (data: any): BotStatus {
    return {
        uuid: data.uuid,
        botUuid: data.bot_uuid,
        isOnline: data['is_online'],
        createdAt: new Date(data['created_at']),
    };
};

export class BotStatusesService {
    private readonly store: BotStatusesStore;
    private readonly client: SupabaseClient;

    constructor(client: SupabaseClient, store: BotStatusesStore) {
        this.store = store;
        this.client = client;
    }

    async fetch(botUuids: string[]) {
      const { data, error } = await this.client
        .from('bot_statuses')
        .select('*')
        .in('bot_uuid', botUuids);

      if (error) throw error;

      this.store.addOrUpdate(...data.map(parseBotStatus));
  };
}

export const botsStatusesService = new BotStatusesService(supabase, botsStatusesStore);
