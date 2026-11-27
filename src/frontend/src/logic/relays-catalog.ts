import type {
    Page, PageOf, Relay, RelayCheck, RelaysFilter, RelaysRead, RelaysSortField, Result, Sort, RelaysCatalog as RelaysCatalogPort } from '../ports';

/** The relays' table and a relay's page (US-D1…US-D16, US-D24). */
export class RelaysCatalog implements RelaysCatalogPort {
    constructor(private readonly relays: RelaysRead) {}

    async list(_filter: RelaysFilter, _sort: Sort<RelaysSortField>, _page: Page): Promise<Result<PageOf<Relay>>> {
        throw new Error('todo');
    }

    async relay(_uuid: string): Promise<Result<Relay | null>> {
        throw new Error('todo');
    }

    async checks(_relayUuids: string[], _page: Page): Promise<Result<PageOf<RelayCheck>>> {
        throw new Error('todo');
    }
}
