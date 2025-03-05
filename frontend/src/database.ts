import { createClient } from '@supabase/supabase-js';
import { supabaseKey, supabaseServersQuickViewTableName, supabaseServersStatusesTableName, supabaseServersTableName, supabaseUrl } from './settings';
import type { Database } from './database.types';


class Server {
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

export const fetchServers = async function (params: FetchParams): Promise<{ servers: Server[], count: number }> {
    let query = supabase.from(supabaseServersQuickViewTableName).select('*', { count: 'exact' });

    if (params.filters) {
        query = params.filters(query);
    }

    if (params.modifyers) {
        query = params.modifyers(query);
    }

    const { data, count, error } = await query.range(params.offset, params.limit + params.offset - 1).returns<Database.public.Tables['servers_quick_view']['Row']>();
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

export const fetchCountries = async function (): Promise<Set<string[]>> {
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
