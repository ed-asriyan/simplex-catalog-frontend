import { writable, type Readable } from 'svelte/store';
import type { Labels, ServerLabels } from '@/ports';

/** The labels every server can have, in the order the pages show them. */
export const labels = ['added', 'ignored'] as const;
export type Label = (typeof labels)[number];

/** The visitor's labels as the pages show them: what the labels port holds, given anew after each change. */
export class LabelsStore implements Readable<Labels> {
    private readonly store;

    constructor(private readonly port: ServerLabels) {
        this.store = writable<Labels>(port.current());
    }

    get subscribe() {
        return this.store.subscribe;
    }

    toggle(uuid: string, label: string) {
        this.port.toggle(uuid, label);
        this.store.set(this.port.current());
    }

    markAdded(uuid: string) {
        this.port.markAdded(uuid);
        this.store.set(this.port.current());
    }

    replace(labels: Labels) {
        this.port.replace(labels);
        this.store.set(this.port.current());
    }
}
