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

export const updateRecord = async function (uri: string, status: boolean): Promise<void> {
    const currentRecord = await getRecord(uri);
    if (!currentRecord) return;

    const lastStatus = currentRecord.status;

    const now = new Date();
    const data = {
        'last_check': now,
    };

    if (lastStatus !== status) {
        data['status'] = status;
        data['status_since'] = now;
    }
    const { error } = await supabase
        .from(supabaseTableName)
        .update(data)
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
