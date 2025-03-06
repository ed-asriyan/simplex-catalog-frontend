import { createClient } from '@supabase/supabase-js';
import { supabaseKey, supabaseServersQuickViewTableName, supabaseServersStatusesTableName, supabaseServersTableName, supabaseUrl } from './settings';
import type { Database } from './database.types';

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

export interface Sort {
    field: 'status' | 'host' | 'identity' | 'country' | 'type' | 'uptime7' | 'uptime30' | 'uptime90' | 'lastCheck';
    order: 'asc' | 'desc';
}

export class Server {
    uuid: string;
    host: string;
    identity: string;
    protocol: number;
    infoPageAvailable: boolean;
    status: boolean;
    uptime7: number;
    uptime30: number;
    uptime90: number;
    lastCheck: string;
    country: string;

    constructor(data: Database.public.Tables['servers_quick_view']['Row']) {
        this.uuid = data.uuid;
        this.host = data.host;
        this.identity = data.identity;
        this.protocol = data.protocol;
        this.infoPageAvailable = data['info_page_available'];
        this.status = data.status;
        this.uptime7 = data.uptime7;
        this.uptime30 = data.uptime30;
        this.uptime90 = data.uptime90;
        this.lastCheck = data['last_check'];
        this.country = data.country;
    }

    get protocolString() {
        return this.protocol === 1 ? 'smp' : 'xftp';
    }

    get uri() {
        return `${this.protocolString}://${this.identity}@${this.host}`;
    }
}

export class ServerStatus {
    uuid: string;
    serverUuid: string;
    country: string;
    status: boolean;
    infoPageAvailable: boolean;
    createdAt: Date;

    constructor(data: Database.public.Tables['servers_statuses']['Row']) {
        this.uuid = data.uuid;
        this.serverUuid = data.server_uuid;
        this.country = data.country;
        this.status = data.status;
        this.infoPageAvailable = data['info_page_available'];
        this.createdAt = new Date(data['created_at']);
    }
}

export type ServerColumn = keyof Server;

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export interface Sort {
    column: ServerColumn;
    direction: 'asc' | 'desc';
}

export interface Filter {
    column: ServerColumn;
    value: string;  
}

export interface FetchParams {
    limit: number;
    offset: number;
    filters?: (a: any) => any;
    modifyers?: (a: any) => any;
}

export const fetchServers = async function (filter: Filter, sort: Sort, pageSize: number, pageNumber: number): Promise<{ servers: Server[], count: number }> {
    let query = supabase.from(supabaseServersQuickViewTableName).select('*', { count: 'exact' });

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

    if (filter.countries?.length) {
        query = query.in('country', filter.countries);
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

    let column: string = sort.column;
    if (column === 'lastCheck') column = 'last_check';
    query = query.order(column, { ascending: sort.direction === 'asc' });

    const start = pageSize * (pageNumber - 1);
    const { data, count, error } = await query.range(start, start + pageSize - 1).returns<Database.public.Tables['servers_quick_view']['Row']>();
    if (error) throw error;

    return {
        servers: data.map(rawValue => new Server(rawValue)),
        count,
    };
};

export const fetchServerStatuses = async function (serverUuids: string[]): Promise<{ servers: ServerStatus[], count: number }> {
    let query = supabase.from(supabaseServersStatusesTableName).select('*');

    query = query.in('server_uuid', serverUuids);
    query = query.order('created_at', { ascending: true });

    const { data, error } = await query.returns<Database.public.Tables['servers_quick_view']['Row']>();
    if (error) throw error;

    return data.map(rawValue => new ServerStatus(rawValue));
};

export const fetchCountries = async function (): Promise<Set<string>> {
    const { data, error } = await supabase.from(supabaseServersQuickViewTableName).select('country').returns<Database.public.Tables['servers_quick_view']['Row']>();
    if (error) throw error;

    return new Set(data.map(({ country }) => country));

};

export const addServer = async function (uri: string) {
    const { error } = await supabase
        .from(supabaseServersTableName)
        .insert({ uri });
    if (error) throw error;
};
