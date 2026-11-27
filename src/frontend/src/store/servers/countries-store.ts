import { derived, writable, type Readable } from 'svelte/store';
import type { CountryCount, ServersCatalog } from '@/ports';
import { readAll } from '../result';

/**
 * The servers online and offline per location, for the counts, the map and the Location filter: read once, when
 * the website opens. Until they are read, or when they cannot be, there are none.
 */
export class CountriesStore {
    private readonly store = writable<CountryCount[]>([]);
    readonly items: Readable<CountryCount[]> = { subscribe: this.store.subscribe };
    readonly allCountries: Readable<string[]> = derived(this.store, $items => $items.map(item => item.country));

    constructor(private readonly servers: ServersCatalog) {}

    async load() {
        const counts = await readAll(page => this.servers.countries(page));
        if (counts.ok) this.store.set(counts.value);
        else console.error('The counts of the servers per location could not be read:', counts.error);
    }
}
