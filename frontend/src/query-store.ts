import { get, writable, type Updater, type Writable } from "svelte/store";

const getQueryParamsFromHash = function<T extends string>(key: string): T | null {
    const hash = window.location.hash.substring(1);

    for (const param of hash.split('&')) {
        const [realKey, value] = param.split('=');
        if (realKey === key) {
            return decodeURIComponent(value) as T;
        }
    }

    return localStorage.getItem(key) as T | null;
};
  
const setQueryParamInHash = function (key: string, value: string | null) {
    const currentHash = window.location.hash.substring(1);
    const params = new URLSearchParams(currentHash);

    if (value === null) {
        params.delete(key);
        localStorage.removeItem(key);
    } else {
        params.set(key, value);
        localStorage.setItem(key, value);
    }

    window.location.hash = params.toString();
};

export class QueryStore<T extends string> implements Writable<T> {
    readonly key: string;
    readonly defaultValue: T;
    private readonly store: Writable<T>;
    readonly permittedValues: T[];

    constructor (key: string, defaultValue: T, permittedValues: T[] = []) {
        this.key = key;
        this.defaultValue = defaultValue;
        this.permittedValues = permittedValues;
        let value = getQueryParamsFromHash<T>(this.key) || this.defaultValue;
        if (this.permittedValues.length > 0 && !this.permittedValues.includes(value)) {
            value = this.defaultValue;
        }
        this.store = writable<T>(value);
    }

    set(value: T): void {
        if (this.permittedValues.length > 0 && !this.permittedValues.includes(value)) {
            value = this.defaultValue;
        }
        setQueryParamInHash(this.key, value);
        this.store.set(value);
    }
    update(updater: Updater<T>): void {
        const newValue = updater(get(this.store));
        this.set(newValue);
    }
    get subscribe() {
        return this.store.subscribe;
    }
}

export class QueryStoreList<T extends string> implements Writable<T[]> {
    private readonly store: QueryStore<string>;

    private static serialize(value: string[]): string {
        return value.join(',');
    }

    private static deserialize(value: string): string[] {
        return value.split(',').filter((x: string) => x !== '');
    }

    constructor (key: string, defaultValue: string[]) {
        this.store = new QueryStore<string>(key, QueryStoreList.serialize(defaultValue));
    }

    set(value: T[]): void {
        return this.store.set(QueryStoreList.serialize(value));
    }
    update(updater: Updater<T[]>): void {
        const newValue = updater(get(this));
        this.set(newValue);
    }
    subscribe(callback: any) {
        return this.store.subscribe(value => {
            return callback(QueryStoreList.deserialize(value) as T[]);
        });
    }
};
