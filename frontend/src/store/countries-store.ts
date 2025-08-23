import { atom, computed } from 'nanostores';

export class CountriesStore {
    private readonly store = atom<Set<string>>(new Set());

    readonly items = computed(this.store, (countries) => Array.from(countries).toSorted());

    addCountry(...countries: string[]) {
        const currentCountries = this.store.get();
        const result = new Set(currentCountries);
        for (const country of countries) {
            result.add(country);
        }
        this.store.set(result);
    }
}
