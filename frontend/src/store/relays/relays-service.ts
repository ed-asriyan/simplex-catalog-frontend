import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../supabase';
import { type Relay, type RelaysStore, relaysStore } from './relays-store';

export interface FilterArray {
    inclusive: boolean;
    values: string[];
}

export interface Filter {
    status?: boolean | undefined;
    text?: string | undefined;
    url?: string | undefined;
    name?: string | undefined;
    uptime7?: number | undefined;
    uptime30?: number | undefined;
    uptime90?: number | undefined;
    uuids?: FilterArray | undefined;
}

export type SortField = 'is_online' | 'url' | 'name' | 'uptime7' | 'uptime30' | 'uptime90' | 'last_check' | 'created_at';
export type SortOrder = 'asc' | 'desc';

export interface Sort {
    field: SortField;
    order: SortOrder;
}

const parseRelay = function (data: any): Relay {
    return {
        uuid: data.uuid,
        url: data.url,
        name: data.name,
        photo: data.photo,
        status: data['is_online'],
        uptime7: data.uptime7,
        uptime30: data.uptime30,
        uptime90: data.uptime90,
        lastCheck: data['last_check'] ? new Date(data['last_check']) : null,
        createdAt: new Date(data['created_at']),
    };
};

export class RelaysService {
    private readonly client: SupabaseClient;
    private readonly store: RelaysStore;

    constructor(client: SupabaseClient, store: RelaysStore) {
        this.client = client;
        this.store = store;
    }

    async fetch(filter: Filter, sort: Sort, pageSize: number, pageNumber: number): Promise<string[]> {
        let query = this.client.from('v_relays_summaries').select('*', { count: 'exact' });

        if (filter.status !== undefined) {
            query = query.eq('is_online', filter.status);
        }

        if (filter.uuids) {
            if (filter.uuids.inclusive) {
                query = query.in('uuid', filter.uuids.values);
            } else {
                for (const uuid of filter.uuids.values) {
                    query.neq('uuid', uuid);
                }
            }
        }

        if (filter.text) {
            query = query.or(`name.ilike.%${filter.text}%,url.ilike.%${filter.text}%`);
        }

        if (filter.url) {
            query = query.ilike('url', `%${filter.url}%`);
        }

        if (filter.name) {
            query = query.ilike('name', `%${filter.name}%`);
        }

        if (filter.uptime7) {
            query = query.gte('uptime7', filter.uptime7);
        }

        if (filter.uptime30) {
            query = query.gte('uptime30', filter.uptime30);
        }

        if (filter.uptime90) {
            query = query.gte('uptime90', filter.uptime90);
        }

        query = query.order(sort.field, { ascending: sort.order === 'asc' });

        const start = pageSize * (pageNumber - 1);
        const { data, count, error } = await query.range(start, start + pageSize - 1);
        if (error) throw error;

        const relays = data.map(parseRelay);

        this.store.addOrUpdate(...relays);
        if (count !== null) this.store.totalCount.set(count);

        return relays.map(({ uuid }) => uuid);
    }

    async addRelay(url: string) {
        const { error: requestError } = await this.client.functions.invoke('add-relay', {
            method: 'POST',
            body: { url }
        });

        if (requestError) {
            const { error } = await requestError.context.json();
            throw new Error(error || 'Failed to add relay');
        }
    }
}

export const relaysService = new RelaysService(supabase, relaysStore);
