import type { ListName, VisitorStorage, RememberedFilters as RememberedFiltersPort } from '../ports';

/** The filters a list was last left with, in this browser (US-B23, US-C10, US-D10). */
export class RememberedFilters implements RememberedFiltersPort {
    constructor(private readonly storage: VisitorStorage) {}

    recall(_list: ListName): unknown | null {
        throw new Error('todo');
    }

    remember(_list: ListName, _filters: unknown): void {
        throw new Error('todo');
    }
}
