import { writable, type Readable, type Writable } from 'svelte/store';

const LOCAL_STORAGE_KEY = 'labels_servers_uuid';

const saveToLocalStorage = function (store: LabeledStoreRecord) {
    const data = Object.fromEntries(
        Object.entries(store).map(([key, value]) => [key, Array.from(value)])
    );
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
};

const loadFromLocalStorage = function (): LabeledStoreRecord {
    const value = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (value === null) {
        return labels.reduce((acc, label) => ({ ...acc, [label]: new Set() }), {});
    } else {
        const parsed = JSON.parse(value);
        return labels.reduce((acc, label) => ({ ...acc, [label]: new Set(parsed[label]) }), {});
    }
};

export const labels = ['added', 'ignored'];
type Labels = typeof labels;
export type Label = Labels[number];

export interface LabeledStoreRecord {
    [x: Label]: Set<string>;
}

export class LabelsStore implements Readable<LabeledStoreRecord> {
    private readonly store: Writable<LabeledStoreRecord>;

    constructor () {
        this.store = writable<LabeledStoreRecord>(loadFromLocalStorage());
    }

    get subscribe () {
        return this.store.subscribe;
    }

    include (uuid: string, label: Label) {
        this.store.update(values => {
            values[label].add(uuid);
            return { ...values };
        });
    }

    exclude (uuid: string, label: Label) {
        this.store.update(values => {
            values[label].delete(uuid);
            saveToLocalStorage(values);
            return { ...values };
        });
    }

    toggle (uuid: string, label: Label) {
        this.store.update(values => {
            if (values[label].has(uuid)) {
                values[label].delete(uuid);
            } else {
                values[label].add(uuid);
            }
            saveToLocalStorage(values);
            return { ...values };
        });
    }

    importFromJson(labels: Record<string, string[]>) {
        const newValues: LabeledStoreRecord = Object.entries(labels).reduce((acc, [label, uuids]) => {
            acc[label] = new Set(uuids);
            return acc;
        }, {} as LabeledStoreRecord);
        this.store.set(newValues);
        saveToLocalStorage(newValues);
    }
}

export const labelsStore = new LabelsStore();
