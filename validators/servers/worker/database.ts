import { createClient } from '@supabase/supabase-js';
import { supabaseKey, supabaseUrl, supabaseTableName } from './settings';

const supabase = createClient(supabaseUrl, supabaseKey);

export interface Record {
    uri: string;
    statusSince: Date;
    lastCheck: Date;
    status: boolean | null;
}

const serialize = function(data: any): Record {
    return {
        uri: data['uri'],
        statusSince: data['status_since'],
        lastCheck: data['last_updated'],
        status: data['status'],
    };
};

export const getRecord = async function (uri: string): Promise<Record> {
    const { data, error } = await supabase
        .from(supabaseTableName)
        .select()
        .eq('uri', uri);
    if (error) {
        throw error;
    } else {
        return data[0] && serialize(data[0]);
    }
};

export const getAllRecords = async function (): Promise<Record[]> {
    const { data, error } = await supabase
        .from(supabaseTableName)
        .select();
    if (error) {
        throw error;
    } else {
        return data.map(serialize);
    }
};

export interface UpdateRecordParams {
    uri: string;
    status: boolean;
    country?: string;
    infoPageAvailable: boolean;
}

export const updateRecord = async function (params: UpdateRecordParams): Promise<void> {
    const currentRecord = await getRecord(params.uri);
    if (!currentRecord) return;

    const lastStatus = currentRecord.status;

    const now = new Date();
    const data = {
        'last_check': now,
        'info_page_available': params.infoPageAvailable,
    };

    if (lastStatus !== params.status) {
        data['status'] = params.status;
        data['status_since'] = now;
    }

    if (typeof params.country === 'string') {
        data['country'] = params.country;
    }

    const { error } = await supabase
        .from(supabaseTableName)
        .update(data)
        .eq('uri', params.uri);
    if (error) throw error;
};

export const deleteRecord = async function (uri: string): Promise<void> {
    const { error } = await supabase
        .from(supabaseTableName)
        .delete()
        .eq('uri', uri)
    if (error) throw error;
};

export const subscribe = function (callback: (uri: string) => void) {
    const channel = supabase
        .channel('schema-db-changes')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: supabaseTableName
            },
            (event) => callback(event['new']['uri']),
        )
        .subscribe()
};
