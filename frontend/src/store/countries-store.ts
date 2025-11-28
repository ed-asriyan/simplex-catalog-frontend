import { computed, type ReadableAtom } from 'nanostores';
import { AbstractStore } from './abstract-store';

export interface Country {
    country: string
    active: number;
    inactive: number;
}

export class CountriesStore extends AbstractStore<Country, 'country', 'active' | 'inactive'> {
    readonly allCountries: ReadableAtom<string[]> = computed(this.items, ($store) => $store.map(item => item.country));

    constructor() {
        super(['country'], ['active', 'inactive']);
    }
}

export const countriesStore = new CountriesStore();
