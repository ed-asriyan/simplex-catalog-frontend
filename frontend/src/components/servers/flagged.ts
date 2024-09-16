import { writable, type Readable, type Writable } from 'svelte/store';

const LOCAL_STORAGE_KEY = 'flagged_servers';
const LOCAL_STORAGE_SEPARATOR = ' ';

const saveToLocalStorage = function (uris: Set<string>) {
    localStorage.setItem(LOCAL_STORAGE_KEY, [...uris].join(LOCAL_STORAGE_SEPARATOR));
};

const loadFromLocalStorage = function (): Set<string> {
    return new Set(localStorage.getItem(LOCAL_STORAGE_KEY)?.split(LOCAL_STORAGE_SEPARATOR));
};

export class FlagedStore implements Readable<Set<string>> {
    private readonly store: Writable<Set<string>>;

    constructor () {
        this.store = writable<Set<string>>(loadFromLocalStorage());
    }

    get subscribe () {
        return this.store.subscribe;
    }

    toggle(uri: string) {
        this.store.update(values => {
            if (values.has(uri)) {
                values.delete(uri);
            } else {
                values.add(uri);
            }
            saveToLocalStorage(values);
            return values;
        });
    }

    set(uri: string, value: boolean) {
        this.store.update(values => {
            if (value) {
                values.add(uri);
            } else {
                values.delete(uri);
            }
            saveToLocalStorage(values);
            return values;
        });
    }
}

export const flagStore = new FlagedStore();
