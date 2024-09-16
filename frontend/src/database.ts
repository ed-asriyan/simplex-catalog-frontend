import { createClient } from '@supabase/supabase-js';
import { supabaseKey, supabaseTableName, supabaseUrl } from './settings';
import { snakeToCamel } from './utils';

export interface Server {
    uuid: string;
    uri: string;
    status: boolean;
    statusSince: string;
    lastCheck: string;
}

export type Column = keyof Server;

const deserialize = function (data: any): Server {
    return Object.entries(data).reduce((obj, [key, value]) => {
        if (typeof value === "string") {
            value = value.trim();
        }
        obj[snakeToCamel(key)] = value;
        return obj;
    }, {}) as Server;
};

const supabase = createClient(supabaseUrl, supabaseKey);

export interface Sort {
    column: Column;
    direction: 'asc' | 'desc';
}

export interface Filter {
    column: Column;
    value: string;  
}

export interface FetchParams {
    limit: number;
    offset: number;
    filters?: (a: any) => any;
    modifyers?: (a: any) => any;
}

export const fetchServers = async function (params: FetchParams): Promise<{ servers: Server[], count: number }> {
    let query = supabase.from(supabaseTableName).select('*', { count: 'exact' });

    if (params.filters) {
        query = params.filters(query);
    }

    if (params.modifyers) {
        query = params.modifyers(query);
    }

    const { data, count, error } = await query.range(params.offset, params.limit + params.offset);
    if (error) throw error;

    return {
        servers: data.map(deserialize),
        count,
    };
};

export const doesServerExist = async function (uri: string): Promise<boolean> {
    const { data, error } = await supabase.from(supabaseTableName)
        .select('*')
        .eq('uri', uri);
    if (error) throw error;
    return !!data.length;
};

export const addServer = async function (uri: string) {
    const { error } = await supabase
        .from(supabaseTableName)
        .insert({ uri });
    if (error) throw error;
};