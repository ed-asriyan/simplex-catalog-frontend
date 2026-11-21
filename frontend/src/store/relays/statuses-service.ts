import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../supabase';
import { type RelayStatus, type RelayStatusesStore, relayStatusesStore } from './statuses-store';

const parseRelayStatus = function (data: any): RelayStatus {
    return {
        uuid: data.uuid,
        relayUuid: data.relay_uuid,
        status: data['is_online'],
        createdAt: new Date(data['created_at']),
    };
};

export class RelayStatusesService {
    private readonly store: RelayStatusesStore;
    private readonly client: SupabaseClient;

    constructor(client: SupabaseClient, store: RelayStatusesStore) {
        this.store = store;
        this.client = client;
    }

    async fetch(relayUuids: string[]) {
        const { data, error } = await this.client
            .from('relay_statuses')
            .select('*')
            .in('relay_uuid', relayUuids)
            .order('created_at', { ascending: true });

        if (error) throw error;

        this.store.addOrUpdate(...data.map(parseRelayStatus));
    }
}

export const relayStatusesService = new RelayStatusesService(supabase, relayStatusesStore);
