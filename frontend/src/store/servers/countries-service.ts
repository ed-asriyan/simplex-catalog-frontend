import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../supabase';
import { countriesStore, type ServersCountriesStore, type ServersCountry } from './countries-store';

interface ServerJoinRow {
    server_statuses: { status: boolean; country: string | null }[];
}

export class ServersCountriesService {
    private readonly store: ServersCountriesStore;
    private readonly client: SupabaseClient;

    constructor(client: SupabaseClient, store: ServersCountriesStore) {
        this.store = store;
        this.client = client;
    }

    async fetchCountries() {
        // server_statuses.server_uuid -> servers.uuid is a real FK, so ordering it desc and limiting to 1
        // resolves each server's latest status in a single request (no separate id lookup needed).
        const { data, error } = await this.client
            .from('servers')
            .select('server_statuses(status, country)')
            .order('created_at', { referencedTable: 'server_statuses', ascending: false })
            .limit(1, { referencedTable: 'server_statuses' });
        if (error) throw error;

        const data_: Record<string, ServersCountry> = (data as unknown as ServerJoinRow[] || [])
            .map(row => row.server_statuses?.[0])
            .filter((s): s is { status: boolean; country: string } => !!s && typeof s.status === 'boolean' && typeof s.country === 'string')
            .reduce((acc, item) => {
                if (!acc[item.country]) {
                    acc[item.country] = {
                        country: item.country,
                        active: 0,
                        inactive: 0
                    };
                }
                acc[item.country][item.status ? 'active' : 'inactive'] += 1;
                return acc;
            }, {} as Record<string, ServersCountry>);

        this.store.addOrUpdate(...Object.values(data_));
    }
}

export const countriesService = new ServersCountriesService(supabase, countriesStore);
