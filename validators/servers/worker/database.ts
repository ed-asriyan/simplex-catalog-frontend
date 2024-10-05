import { createClient } from '@supabase/supabase-js';
import { supabaseKey, supabaseUrl, supabaseServersTableName, supabaseServersStatusTableName } from './settings';

const supabase = createClient(supabaseUrl, supabaseKey);

export interface Server {
    uuid: string;
    uri: string;
}

export interface ServerStatus {
    serverUuid: string;
    status: boolean;
    country?: string;
    infoPageAvailable: boolean;
}

const serializeServer = function(data: any): Server {
    return {
        uuid: data['uuid'],
        uri: data['uri'],
    };
};

export const getServer = async function (uri: string): Promise<Server> {
    const { data, error } = await supabase
        .from(supabaseServersTableName)
        .select()
        .eq('uri', uri);
    if (error) {
        throw error;
    } else {
        return data[0] && serializeServer(data[0]);
    }
};

export const getAllServers = async function (): Promise<Server[]> {
    const { data, error } = await supabase
        .from(supabaseServersTableName)
        .select();
    if (error) {
        throw error;
    } else {
        return data.map(serializeServer);
    }
};

export const addServerStatus = async function (status: ServerStatus): Promise<void> {
    const { error } = await supabase
        .from(supabaseServersStatusTableName)
        .insert({
            'server_uuid': status.serverUuid,
            'status': status.status,
            'country': status.country,
            'info_page_available': status.infoPageAvailable,
        });
    if (error) throw error;
};

export const deleteRecord = async function (uri: string): Promise<void> {
    const { error } = await supabase
        .from(supabaseServersTableName)
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
                table: supabaseServersTableName
            },
            (event) => callback(event['new']['uri']),
        )
        .subscribe()
};
