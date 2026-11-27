import type {
    CountryCount, Page, PageOf, Result, Server, ServerCheck, ServersFilter, ServersRead,
    ServersSortField, Sort, ServerLabels as ServerLabelsPort, ServersCatalog as ServersCatalogPort } from '../ports';

/**
 * The servers' filtering by status, type, location, info page and the visitor's labels, their sorting and their
 * paging are done here, over every page `ServersRead.list` gives, because a server's status, location and info
 * page come from its latest check and the labels are the visitor's (US-B10…US-B29).
 */
export class ServersCatalog implements ServersCatalogPort {
    constructor(
        private readonly servers: ServersRead,
        private readonly labels: ServerLabelsPort,
    ) {}

    async list(_filter: ServersFilter, _sort: Sort<ServersSortField>, _page: Page): Promise<Result<PageOf<Server>>> {
        throw new Error('todo');
    }

    async server(_uuid: string): Promise<Result<Server | null>> {
        throw new Error('todo');
    }

    async checks(_serverUuids: string[], _page: Page): Promise<Result<PageOf<ServerCheck>>> {
        throw new Error('todo');
    }

    async othersWithIdentity(_server: Server): Promise<Result<number>> {
        throw new Error('todo');
    }

    async countries(_page: Page): Promise<Result<PageOf<CountryCount>>> {
        throw new Error('todo');
    }
}
