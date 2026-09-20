import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../supabase';
import { serversStore, type Server, type ServersStore } from './servers-store';
import { labelsStore } from './labels-store';
import { get } from 'svelte/store';

export type ServerColumn = keyof Server;

export interface FilterArray {
    inclusive: boolean;
    values: string[];
}

export interface Filter {
    labels: FilterArray | undefined;
    status?: boolean | 'unknown' | undefined;
    countries?: FilterArray | undefined;
    identity?: string | undefined;
    uuid?: string | undefined;
    infoPageAvailable?: boolean | undefined;
    host?: string | undefined;
    protocol?: 'smp' | 'xftp' | undefined;
    uptime7?: number | undefined;
    uptime30?: number | undefined;
    uptime90?: number | undefined;
}

export type SortField = 'status' | 'host' | 'identity' | 'country' | 'protocol' | 'uptime7' | 'uptime30' | 'uptime90' | 'last_check' | 'info_page_available' | 'created_at';
export type SortOrder = 'asc' | 'desc';

export interface Sort {
    field: SortField;
    order: SortOrder;
}

interface StatusRow {
    uuid: string;
    status: boolean;
    country: string | null;
    info_page_available: boolean;
    created_at: string;
}

interface ServerRow {
    uuid: string;
    protocol: number;
    created_at: string;
}

// One row of v_server_summaries with everything joined in.
interface SummaryJoinRow {
    server_uuid: string;
    // null when there's no status check within that window (not the same as 0% uptime)
    uptime7: number | null;
    uptime30: number | null;
    uptime90: number | null;
    // host/identity are spread onto the root; `servers` rides up with the host spread and holds
    // the servers on that host, so match on uuid.
    host: string;
    identity: string;
    servers: ServerRow[];
    last_server_status_uuid: string | null;
}

// PostgREST rejects an `in.(...)` list once the URL gets past ~20KB (500 uuids is ~18KB and fine,
// 700 is not), so the status lookup is chunked and the chunks run in parallel.
const STATUS_UUID_CHUNK = 500;

// Comparable value extractor for client-side sorting/filtering, since status/country/uptime
// are resolved per-server after the join and can't all be pushed down to the DB in one query.
const sortValue = function (server: Server, field: SortField): any {
    switch (field) {
        case 'last_check': return server.lastCheck?.getTime() ?? -Infinity;
        case 'created_at': return server.createdAt.getTime();
        case 'info_page_available': return server.infoPageAvailable;
        default: return (server as any)[field];
    }
};

const compareValues = function (a: any, b: any): number {
    if (a === b) return 0;
    if (a === null || a === undefined) return -1;
    if (b === null || b === undefined) return 1;
    if (typeof a === 'boolean' && typeof b === 'boolean') return (a === b) ? 0 : (a ? 1 : -1);
    return a < b ? -1 : a > b ? 1 : 0;
};

export class ServersService {
    private readonly client: SupabaseClient;
    private readonly store: ServersStore;

    constructor(client: SupabaseClient, store: ServersStore) {
        this.client = client;
        this.store = store;
    }

    async fetch (filter: Filter, sort: Sort, pageSize: number, pageNumber: number): Promise<string[]> {
        // host/identity spread onto each row, `servers` rides up with the host spread. The latest
        // status is fetched by last_server_status_uuid in a follow-up `in.(...)` query below, since
        // that column carries a primary key and so can't be embedded.
        let query = this.client
            .from('v_server_summaries')
            .select(`
                server_uuid,
                uptime7,
                uptime30,
                uptime90,
                last_server_status_uuid,
                ...server_hosts!inner(host, servers(uuid, protocol, created_at)),
                ...server_identities!inner(identity)
            `);

        if (filter.uuid) {
            query = query.eq('server_uuid', filter.uuid);
        }
        if (filter.host) {
            query = query.ilike('server_hosts.host', `%${filter.host}%`);
        }
        if (filter.identity) {
            query = query.ilike('server_identities.identity', `%${filter.identity}%`);
        }
        if (filter.uptime7 !== undefined) {
            query = query.gte('uptime7', filter.uptime7);
        }
        if (filter.uptime30 !== undefined) {
            query = query.gte('uptime30', filter.uptime30);
        }
        if (filter.uptime90 !== undefined) {
            query = query.gte('uptime90', filter.uptime90);
        }

        const { data, error } = await query;
        if (error) throw error;

        let rows = data as unknown as SummaryJoinRow[];

        if (filter.labels) {
            const uuids = new Set(filter.labels.values.reduce((acc, label) => {
                return [...acc, ...Array.from(get(labelsStore)[label])] as string[];
            }, [] as string[]));
            rows = rows.filter(row => filter.labels!.inclusive ? uuids.has(row.server_uuid) : !uuids.has(row.server_uuid));
        }

        const statusUuids = [...new Set(rows.map(row => row.last_server_status_uuid).filter((uuid): uuid is string => !!uuid))];
        const chunks: string[][] = [];
        for (let i = 0; i < statusUuids.length; i += STATUS_UUID_CHUNK) {
            chunks.push(statusUuids.slice(i, i + STATUS_UUID_CHUNK));
        }

        const statusByUuid = new Map<string, StatusRow>();
        const statusResults = await Promise.all(chunks.map(chunk => this.client
            .from('server_statuses')
            .select('uuid, status, country, info_page_available, created_at')
            .in('uuid', chunk)));
        for (const { data: statusData, error: statusError } of statusResults) {
            if (statusError) throw statusError;
            for (const s of (statusData as StatusRow[])) statusByUuid.set(s.uuid, s);
        }

        let servers: Server[] = rows.map(row => {
            const status = row.last_server_status_uuid ? statusByUuid.get(row.last_server_status_uuid) : undefined;
            const self = row.servers?.find(s => s.uuid === row.server_uuid);
            return {
                uuid: row.server_uuid,
                host: row.host,
                identity: row.identity,
                protocol: self?.protocol === 2 ? 'xftp' : 'smp',
                infoPageAvailable: status?.info_page_available ?? false,
                // may legitimately be null when a server has no recorded status yet; Server['status'] stays
                // typed as boolean since StatusBadge et al. already treat null as "unknown" at runtime.
                status: status ? status.status : null,
                uptime7: row.uptime7,
                uptime30: row.uptime30,
                uptime90: row.uptime90,
                lastCheck: status?.created_at ? new Date(status.created_at) : null,
                country: status?.country ?? '',
                createdAt: self?.created_at ? new Date(self.created_at) : new Date(0),
            } as Server;
        });

        // These all come from the latest-status join, so they're filtered here rather than server-side:
        // an eq filter on that embed would be applied before its limit, and could match an older row.
        if (filter.protocol) {
            servers = servers.filter(s => s.protocol === filter.protocol);
        }
        if (filter.status === 'unknown') {
            servers = servers.filter(s => s.status === null);
        } else if (filter.status !== undefined) {
            servers = servers.filter(s => s.status === filter.status);
        }
        if (filter.infoPageAvailable !== undefined) {
            servers = servers.filter(s => s.infoPageAvailable === filter.infoPageAvailable);
        }
        if (filter.countries) {
            const { inclusive, values } = filter.countries;
            servers = servers.filter(s => inclusive ? values.includes(s.country) : !values.includes(s.country));
        }

        servers.sort((a, b) => {
            const result = compareValues(sortValue(a, sort.field), sortValue(b, sort.field));
            return sort.order === 'asc' ? result : -result;
        });

        this.store.totalCount.set(servers.length);

        const start = pageSize * (pageNumber - 1);
        const page = servers.slice(start, start + pageSize);

        this.store.addOrUpdate(...page);

        return page.map(({ uuid }) => uuid);
    }

    async countByIdentity(identity: string, excludeUuid?: string): Promise<number> {
        const { data: identityRow, error: identityError } = await this.client
            .from('server_identities')
            .select('uuid')
            .eq('identity', identity)
            .maybeSingle();
        if (identityError) throw identityError;
        if (!identityRow) return 0;

        let query = this.client
            .from('servers')
            .select('*', { count: 'exact', head: true })
            .eq('identity_uuid', identityRow.uuid);

        if (excludeUuid) {
            query = query.neq('uuid', excludeUuid);
        }

        const { count, error } = await query;
        if (error) throw error;

        return count || 0;
    }

    async addServer (uri: string) {
        const { error: requestError } = await this.client.functions.invoke('add-server', {
            method: 'POST',
            body: { uri }
        });

        if (requestError) {
            const { error } = await requestError.context.json();
            throw new Error(error || 'Failed to add server');
        }
    }
}

export const serversService = new ServersService(supabase, serversStore);
