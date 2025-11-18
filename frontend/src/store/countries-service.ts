import type { SupabaseClient } from '@supabase/supabase-js';
import type { CountriesStore, Country } from './countries-store';

export class CountriesService {
    private readonly store: CountriesStore;
    private readonly client: SupabaseClient;

    constructor(client: SupabaseClient, store: CountriesStore) {
        this.store = store;
        this.client = client;
    }

    private async fetchCountriesData(): Promise<any[]> {
        const { data, error } = await this.client
            .from('v_server_summaries')
            .select('country,status,count:country.count()');

        if (error) throw error;
        return data;
    }

    async fetchCountries() {
        const items = await this.fetchCountriesData();

        const data: Record<string, Country> = items
            .filter(({ status, count, country }) => typeof status === 'boolean' && typeof count === 'number' && typeof country === 'string')
            .reduce((acc, item) => {
                if (!acc[item.country]) {
                    acc[item.country] = {
                        country: item.country,
                        active: 0,
                        inactive: 0
                    };
                }
                acc[item.country][item.status ? 'active' : 'inactive'] += item.count;
                return acc;
            }, {});

        this.store.addOrUpdate(...Object.values(data));
    }
}
