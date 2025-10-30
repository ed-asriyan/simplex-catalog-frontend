import type { SupabaseClient } from '@supabase/supabase-js';
import type { Server, ServersStore } from './servers-store';

export type ServerColumn = keyof Server;

export interface FilterArray {
    inclusive: boolean;
    values: string[];
}

export interface Filter {
    status: boolean | 'unknown' | null;
    countries: FilterArray | null;
    identity: string | null;
    infoPageAvailable: boolean | null;
    host: string | null;
    protocol: 'smp' | 'xftp' | null;
    uptime7: number | null;
    uptime30: number | null;
    uptime90: number | null;
    uuids: FilterArray | null;
}

export type SortField = 'status' | 'host' | 'identity' | 'country' | 'type' | 'uptime7' | 'uptime30' | 'uptime90' | 'lastCheck';
export type SortOrder = 'asc' | 'desc';

export interface Sort {
    field: SortField;
    order: SortOrder;
}

const parseServer = function (data: any): Server {
    return {
        uuid: data.uuid,
        host: data.host,
        identity: data.identity,
        protocol: data.protocol === 1 ? 'smp' : 'xftp',
        infoPageAvailable: data['info_page_available'],
        status: data.status,
        uptime7: data.uptime7,
        uptime30: data.uptime30,
        uptime90: data.uptime90,
        lastCheck: data['last_check'],
        country: data.country,
    }
};

export class ServersService {
    private readonly client: SupabaseClient;
    private readonly store: ServersStore;

    constructor(client: SupabaseClient, store: ServersStore) {
        this.client = client;
        this.store = store;
    }
    
    async fetch (filter: Filter, sort: Sort, pageSize: number, pageNumber: number): Promise<string[]> {
        let query = this.client.from('servers_view').select('*', { count: 'exact' });

        if (filter.status !== null) {
            if (filter.status === 'unknown') {
                query = query.is('status', null);
            } else {
                query = query.eq('status', filter.status);
            }
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
    
        if (filter.identity) {
            query = query.like('identity', `%${filter.identity}%`);
        }
    
        if (filter.host) {
            query = query.like('host', `%${filter.host}%`);
        }
    
        if (filter.countries) {
            if (filter.countries.inclusive) {
                query = query.in('country', filter.countries.values);
            } else {
                for (const uuid of filter.countries.values) {
                    query.neq('country', uuid);
                }
            }
        }
    
        if (filter.protocol) {
            query = query.eq('protocol', filter.protocol === 'smp' ? 1 : 2);
        }
    
        if (filter.infoPageAvailable !== null) {
            query = query.eq('info_page_available', filter.infoPageAvailable);
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

    async addServer (uri: string) {
        const { error: requestError } = await this.client.functions.invoke('add-server', {
            method: 'POST',
            body: { uri }
        });
        
        if (requestError) {
            const { error } = await requestError.context.json();
            throw new Error(error || 'Failed to add server');
        }
    }
}