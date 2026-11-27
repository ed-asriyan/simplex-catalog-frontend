import type { ListName, VisitorStorage, RememberedFilters as RememberedFiltersPort } from '../ports';

/**
 * The filters a list was last left with, in this browser (US-B23, US-C10, US-D10). Filters that set nothing are
 * as though the list was never filtered, so the list starts with its first visit's; what the browser kept that is
 * not a set of filters, or cannot be read, is the same. A failure to keep them costs the next visit its filters
 * and nothing else, so it is not given.
 */
export class RememberedFilters implements RememberedFiltersPort {
    constructor(private readonly storage: VisitorStorage) {}

    recall(list: ListName): unknown | null {
        const kept = this.storage.loadFilters(list);
        if (!kept.ok) return null;
        const filters = kept.value;
        if (typeof filters !== 'object' || filters === null || Array.isArray(filters)) return null;
        return Object.values(filters).some(value => value !== undefined && value !== null) ? filters : null;
    }

    remember(list: ListName, filters: unknown): void {
        this.storage.saveFilters(list, filters);
    }
}
