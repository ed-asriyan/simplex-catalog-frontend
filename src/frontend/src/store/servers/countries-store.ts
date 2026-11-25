import { computed, type ReadableAtom } from 'nanostores';
import { AbstractStore } from '../abstract-store';

export interface ServersCountry {
    country: string
    active: number;
    inactive: number;
}

export class ServersCountriesStore extends AbstractStore<ServersCountry, 'country', 'active' | 'inactive'> {
    readonly allCountries: ReadableAtom<string[]> = computed(this.items, ($store) => $store.map(item => item.country));

    constructor() {
        super(['country'], ['active', 'inactive']);
    }
}

export const countriesStore = new ServersCountriesStore();
