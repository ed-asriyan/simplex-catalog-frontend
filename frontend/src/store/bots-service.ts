import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { type Bot, type BotsStore, botsStore } from './bots-store';

export type BotColumn = keyof Bot;

export interface FilterArray {
    inclusive: boolean;
    values: string[];
}

export interface Filter {
    isOnline?: boolean | undefined;
    text?: string | undefined;
    uptime7?: number | undefined;
    uptime30?: number | undefined;
    uptime90?: number | undefined;
    uuids?: FilterArray | undefined;
}

export type SortField = 'is_online' | 'address' | 'uptime7' | 'uptime30' | 'uptime90' | 'lastCheck';
export type SortOrder = 'asc' | 'desc';

export interface Sort {
    field: SortField;
    order: SortOrder;
}

const parseServer = function (data: any): Bot {
    return {
        uuid: data.uuid,
        address: data.address,
        name: data.name,
        description: data.description,
        photo: data.photo,
        isOnline: data['is_online'],
        uptime7: data.uptime7,
        uptime30: data.uptime30,
        uptime90: data.uptime90,
        lastCheck: new Date(data['last_check']),
        createdAt: new Date(data['created_at']),
    };
};

export class BotsService {
    private readonly client: SupabaseClient;
    private readonly store: BotsStore;

    constructor(client: SupabaseClient, store: BotsStore) {
        this.client = client;
        this.store = store;
    }
    
    async fetch (filter: Filter, sort: Sort, pageSize: number, pageNumber: number): Promise<string[]> {
        let query = this.client.from('v_bot_summaries').select('*', { count: 'exact' });

        if (filter.isOnline !== undefined) {
            query = query.eq('is_online', filter.isOnline);
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
            query = query.or(`name.ilike.%${filter.text}%,description.ilike.%${filter.text}%`);
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
    
        let field: string = sort.field;
        if (field === 'lastCheck') field = 'last_check';
        query = query.order(field, { ascending: sort.order === 'asc' });

        const start = pageSize * (pageNumber - 1);
        const { data, count, error } = await query.range(start, start + pageSize - 1);
        if (error) throw error;

        const servers = data.map(parseServer);

        this.store.addOrUpdate(...servers);
        count && this.store.totalCount.set(count);

        return servers.map(({ uuid }) => uuid);
    }

    async addBot (url: string) {
        const { error: requestError } = await this.client.functions.invoke('add-bot', {
            method: 'POST',
            body: { url }
        });
        
        if (requestError) {
            const { error } = await requestError.context.json();
            throw new Error(error || 'Failed to add bot');
        }
    }
}

export const botsService = new BotsService(supabase, botsStore);
