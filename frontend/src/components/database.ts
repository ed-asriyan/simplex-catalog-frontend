import { createClient } from '@supabase/supabase-js';
import { supabaseKey, supabaseTableName, supabaseUrl } from '../settings';

const camelToSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const snakeToCamel = (str: string) =>
    str.toLowerCase().replace(/([-_][a-z])/g, group =>
      group
        .toUpperCase()
        .replace('-', '')
        .replace('_', '')
    );

export interface Server {
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
    sort?: Sort;
    filter?: Filter;
}

export const fetchServers = async function (params: FetchParams): Promise<{ servers: Server[], count: number }> {
    let query = supabase.from(supabaseTableName).select('*', { count: 'exact' });

    // Apply status filter
    if (params.filter) {
        query = query.eq(camelToSnakeCase(params.filter.column), params.filter.value);
    }

    // Apply sorting
    if (params.sort) {
        query = query.order(camelToSnakeCase(params.sort.column), { ascending: params.sort.direction === 'asc' });
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