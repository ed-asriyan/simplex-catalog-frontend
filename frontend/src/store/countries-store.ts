import { atom, computed } from 'nanostores';

export class CountriesStore {
    private readonly store = atom<Set<string>>(new Set());

    readonly items = computed(this.store, (countries) => Array.from(countries).toSorted());

    addCountry(...countries: string[]) {
        const currentCountries = this.store.get();
        countries.forEach(country => currentCountries.add(country));
        this.store.set(currentCountries);
    }
}
