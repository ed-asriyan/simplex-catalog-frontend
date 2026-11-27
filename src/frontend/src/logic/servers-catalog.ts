import type {
    CountryCount, Page, PageOf, Result, Server, ServerCheck, ServerQuery, ServersFilter, ServersRead,
    ServersSortField, Sort, ServerLabels as ServerLabelsPort, ServersCatalog as ServersCatalogPort } from '../ports';

/** As many servers as the backend gives in one answer. */
const READ_PAGE_SIZE = 1000;

type Comparable = string | number | boolean | null | undefined;

const sortValue = (server: Server, field: ServersSortField): Comparable => {
    switch (field) {
        case 'last_check': return server.lastCheck?.getTime() ?? -Infinity;
        case 'created_at': return server.createdAt.getTime();
        case 'info_page_available': return server.infoPageAvailable;
        default: return server[field];
    }
};

/** Nothing before everything, `false` before `true`. */
const compare = (a: Comparable, b: Comparable): number => {
    if (a === b) return 0;
    if (a === null || a === undefined) return -1;
    if (b === null || b === undefined) return 1;
    return a < b ? -1 : a > b ? 1 : 0;
};

const queryOf = (filter: ServersFilter): ServerQuery => {
    const query: ServerQuery = {};
    if (filter.uuid) query.uuid = filter.uuid;
    if (filter.host) query.host = filter.host;
    if (filter.identity) query.identity = filter.identity;
    if (filter.uptime7 !== undefined) query.minUptime7 = filter.uptime7;
    if (filter.uptime30 !== undefined) query.minUptime30 = filter.uptime30;
    if (filter.uptime90 !== undefined) query.minUptime90 = filter.uptime90;
    return query;
};

/**
 * The servers' filtering by status, type, location, info page and the visitor's labels, their sorting and their
 * paging are done here, over every page `ServersRead.list` gives, because a server's status, location and info
 * page come from its latest check and the labels are the visitor's (US-B10…US-B29). What the backend can narrow
 * by itself (the id, the host, the identity, the uptime) it is asked to. A list one of whose pages could not be
 * read is an error, never the servers of the pages that were.
 */
export class ServersCatalog implements ServersCatalogPort {
    constructor(
        private readonly servers: ServersRead,
        private readonly labels: ServerLabelsPort,
    ) {}

    async list(filter: ServersFilter, sort: Sort<ServersSortField>, page: Page): Promise<Result<PageOf<Server>>> {
        const all = await this.readAll(queryOf(filter));
        if (!all.ok) return all;

        let servers = all.value;
        if (filter.labels) {
            const { inclusive, values } = filter.labels;
            const current = this.labels.current();
            const labelled = new Set(values.flatMap(label => current[label] ?? []));
            servers = servers.filter(s => labelled.has(s.uuid) === inclusive);
        }
        if (filter.protocol) servers = servers.filter(s => s.protocol === filter.protocol);
        if (filter.status === 'unknown') servers = servers.filter(s => s.status === null);
        else if (filter.status !== undefined) servers = servers.filter(s => s.status === filter.status);
        if (filter.infoPageAvailable !== undefined) servers = servers.filter(s => s.infoPageAvailable === filter.infoPageAvailable);
        if (filter.countries) {
            const { inclusive, values } = filter.countries;
            servers = servers.filter(s => values.includes(s.country) === inclusive);
        }

        const direction = sort.order === 'asc' ? 1 : -1;
        servers = [...servers].sort((a, b) => direction * compare(sortValue(a, sort.field), sortValue(b, sort.field)));

        const start = page.size * (page.number - 1);
        return { ok: true, value: { items: servers.slice(start, start + page.size), total: servers.length } };
    }

    async server(uuid: string): Promise<Result<Server | null>> {
        const found = await this.servers.list({ uuid }, { size: 1, number: 1 });
        return found.ok ? { ok: true, value: found.value.items[0] ?? null } : found;
    }

    checks(serverUuids: string[], page: Page): Promise<Result<PageOf<ServerCheck>>> {
        return this.servers.checks(serverUuids, page);
    }

    othersWithIdentity(server: Server): Promise<Result<number>> {
        return this.servers.countWithIdentity(server.identity, server.uuid);
    }

    countries(page: Page): Promise<Result<PageOf<CountryCount>>> {
        return this.servers.countries(page);
    }

    /** Every page of the servers the query lets through: the first says how many there are, the rest are read at once. */
    private async readAll(query: ServerQuery): Promise<Result<Server[]>> {
        const first = await this.servers.list(query, { size: READ_PAGE_SIZE, number: 1 });
        if (!first.ok) return first;
        const pageCount = Math.ceil(first.value.total / READ_PAGE_SIZE);
        const rest = await Promise.all(Array.from({ length: Math.max(0, pageCount - 1) },
            (_, i) => this.servers.list(query, { size: READ_PAGE_SIZE, number: i + 2 })));
        const servers = [...first.value.items];
        for (const page of rest) {
            if (!page.ok) return page;
            servers.push(...page.value.items);
        }
        return { ok: true, value: servers };
    }
}
