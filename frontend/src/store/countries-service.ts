import type { SupabaseClient } from '@supabase/supabase-js';
import type { CountriesStore } from './countries-store';

export class CountriesService {
    private readonly store: CountriesStore;
    private readonly client: SupabaseClient;

    constructor(client: SupabaseClient, store: CountriesStore) {
        this.store = store;
        this.client = client;
    }

    async fetchCountries() {
        const { data, error } = await this.client.from('servers_view').select('country');
        if (error) throw error;

        this.store.addCountry(...data.map(({ country }) => country));
    }
}
