import type {
    Page, PageOf, Relay, RelayCheck, RelaysFilter, RelaysRead, RelaysSortField, Result, Sort, RelaysCatalog as RelaysCatalogPort } from '../ports';

/** The relays' table and a relay's page (US-D1…US-D16, US-D24): the database filters, sorts and pages them. */
export class RelaysCatalog implements RelaysCatalogPort {
    constructor(private readonly relays: RelaysRead) {}

    list(filter: RelaysFilter, sort: Sort<RelaysSortField>, page: Page): Promise<Result<PageOf<Relay>>> {
        return this.relays.list(filter, sort, page);
    }

    async relay(uuid: string): Promise<Result<Relay | null>> {
        const found = await this.relays.list(
            { uuids: { inclusive: true, values: [uuid] } }, { field: 'created_at', order: 'asc' }, { size: 1, number: 1 });
        return found.ok ? { ok: true, value: found.value.items[0] ?? null } : found;
    }

    checks(relayUuids: string[], page: Page): Promise<Result<PageOf<RelayCheck>>> {
        return this.relays.checks(relayUuids, page);
    }
}
