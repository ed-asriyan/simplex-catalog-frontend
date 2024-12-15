import { createClient } from '@supabase/supabase-js';
import { supabaseKey, supabaseServersQuickViewTableName, supabaseServersStatusesTableName, supabaseServersTableName, supabaseUrl } from './settings';
import type { Database } from './database.types';

export interface ServerUri {
    type: 'smp' | 'xftp';
    domain: string;
};

const domainPattern = /(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}/g;
const extractDomain = function (inputString: string): string | null {
    const matches = inputString.match(domainPattern);
    return matches ? matches[0] : null;
}

const parseUri = function (uri: string): ServerUri {
    const type = uri.split(':')[0] as 'smp' | 'xftp';
    if (uri.endsWith('.onion')) {
        if (uri.includes(',')){
            return {
                type,
                domain: extractDomain(uri),
            };
        } else {
            return {
                type,
                domain: null,
            };
        }
    } else {
        return {
            type,
            domain: extractDomain(uri),
        }
    }
};

class Server {
    uuid: string;
    uri: string;
    infoPageAvailable: boolean;
    status: boolean;
    uptime7: number;
    uptime30: number;
    uptime90: number;
    lastCheck: string;
    countries: string[];
    parsedUri: ServerUri;

    constructor(data: Database.public.Tables['servers_quick_view']['Row']) {
        this.uuid = data.uuid;
        this.uri = data.uri;
        this.infoPageAvailable = data['info_page_available'];
        this.status = data.status;
        this.uptime7 = data.uptime7;
        this.uptime30 = data.uptime30;
        this.uptime90 = data.uptime90;
        this.lastCheck = data['last_check'];
        this.countries = data.countries?.split(',') || [];

        this.parsedUri = parseUri(this.uri);
    }
}

export class ServerStatus {
    uuid: string;
    serverUuid: string;
    countries: string[];
    status: boolean;
    infoPageAvailable: boolean;
    createdAt: Date;

    constructor(data: Database.public.Tables['servers_statuses']['Row']) {
        this.uuid = data.uuid;
        this.serverUuid = data.server_uuid;
        this.countries = data.countries?.split(',') || [];
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
    const { data, error } = await supabase.from(supabaseServersQuickViewTableName).select('countries').returns<Database.public.Tables['servers_quick_view']['Row']>();
    if (error) throw error;

    return new Set(data.reduce((list, { countries }) => {
        if (!countries) return list;
        return [...list, ...countries.split(',')];
    }, []));
};

export const doesServerExist = async function (uri: string): Promise<boolean> {
    const { data, error } = await supabase.from(supabaseServersTableName)
        .select('*')
        .eq('uri', uri);
    if (error) throw error;
    return !!data.length;
};

export const addServer = async function (uri: string) {
    const { error } = await supabase
        .from(supabaseServersTableName)
        .insert({ uri });
    if (error) throw error;
};
