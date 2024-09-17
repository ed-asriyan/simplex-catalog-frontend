import { get, writable, type Updater, type Writable } from "svelte/store";

const getQueryParamsFromHash = function (key: string): string | null {
    const hash = window.location.hash.substring(1);

    for (const param of hash.split('&')) {
        const [realKey, value] = param.split('=');
        if (realKey === key) {
            return decodeURIComponent(value);
        }
    }
    
    return localStorage.getItem(key);
};
  
const setQueryParamInHash = function (key: string, value: string | null) {
    const currentHash = window.location.hash.substring(1);
    const params = new URLSearchParams(currentHash);

    if (value === null) {
        params.delete(key);
        localStorage.removeItem(key);
    } else {
        params.set(key, encodeURIComponent(value));
        localStorage.setItem(key, value);
    }

    window.location.hash = params.toString();
};

export class QueryStore implements Writable<string> {
    readonly key: string;
    readonly defaultValue: string;
    private readonly store: Writable<string>;

    constructor (key: string, defaultValue: string) {
        this.key = key;
        this.defaultValue = defaultValue
        this.store = writable<string>(getQueryParamsFromHash(this.key) || this.defaultValue);
    }


    set(value: string): void {
        setQueryParamInHash(this.key, value);
        this.store.set(value);
    }
    update(updater: Updater<string>): void {
        const newValue = updater(get(this.store));
        this.set(newValue);
    }
    get subscribe() {
        return this.store.subscribe;
    }
}
