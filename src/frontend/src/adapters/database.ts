// The catalog as the database has it, read through supabase-js with the public key: the views and tables the
// policies let `anon` read (design rule 2). Every list is read a page at a time, with `range` and an exact
// count, so the backend's limit on the rows of one answer never cuts a list short where nobody sees it
// (design rule 8); a page past the last one is no error, but no rows and the count.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
    Bot, BotCheck, BotDetails, BotsFilter, BotsRead, BotsSortField, CountryCount, FilterArray, Page, PageOf, Relay,
    RelayCheck, RelaysFilter, RelaysRead, RelaysSortField, Result, Server, ServerCheck, ServerQuery, ServersRead, Sort,
} from '../ports';
import { attempt, err, ok, rangeOf } from './result';

/** What PostgREST answers when the page asked for starts past the last row. */
const RANGE_NOT_SATISFIABLE = 'PGRST103';

type Query = any;
type Row = Record<string, unknown>;

/**
 * The page of the rows `select` lets through, `narrow` applied to it, and how many it lets through in all.
 * `narrow` is applied again for the count alone when the page is past the last.
 */
async function readPage<T>(
    select: (head: boolean) => Query, narrow: (query: Query) => Query, page: Page, parse: (row: Row) => T,
): Promise<Result<PageOf<T>>> {
    const [from, to] = rangeOf(page);
    const { data, count, error } = await narrow(select(false)).range(from, to);
    if (error?.code === RANGE_NOT_SATISFIABLE) {
        const { count: total, error: countError } = await narrow(select(true));
        if (countError) return err(countError.message);
        return ok({ items: [], total: total ?? 0 });
    }
    if (error) return err(error.message);
    return ok({ items: (data as Row[]).map(parse), total: count ?? 0 });
}

const date = (value: unknown): Date | null => value ? new Date(value as string) : null;

const byUuids = (query: Query, uuids: FilterArray | undefined): Query => {
    if (!uuids) return query;
    if (uuids.inclusive) return query.in('uuid', uuids.values);
    for (const uuid of uuids.values) query = query.neq('uuid', uuid);
    return query;
};

const atLeast = (query: Query, filter: { uptime7?: number; uptime30?: number; uptime90?: number }): Query => {
    if (filter.uptime7) query = query.gte('uptime7', filter.uptime7);
    if (filter.uptime30) query = query.gte('uptime30', filter.uptime30);
    if (filter.uptime90) query = query.gte('uptime90', filter.uptime90);
    return query;
};

/** PostgREST takes a list of ids in the address, which it refuses past ~20KB: 500 ids are well below. */
const ID_CHUNK = 500;
const chunks = <T>(all: T[]): T[][] =>
    Array.from({ length: Math.ceil(all.length / ID_CHUNK) }, (_, i) => all.slice(i * ID_CHUNK, (i + 1) * ID_CHUNK));

// ---- Servers

/**
 * A server's summary, with its host and identity spread onto it; `servers` rides up with the host and holds the
 * servers on that host, the server among them. Its latest check is read apart, by `last_server_status_uuid`:
 * that column is no foreign key, so it cannot be embedded.
 */
const SERVER_SUMMARY = `
    server_uuid,
    uptime7,
    uptime30,
    uptime90,
    last_server_status_uuid,
    ...server_hosts!inner(host, servers(uuid, protocol, created_at)),
    ...server_identities!inner(identity)
`;

interface SummaryRow {
    server_uuid: string;
    uptime7: number | null;
    uptime30: number | null;
    uptime90: number | null;
    last_server_status_uuid: string | null;
    host: string;
    identity: string;
    servers: { uuid: string; protocol: number; created_at: string }[] | null;
}

interface StatusRow {
    uuid: string;
    server_uuid: string;
    status: boolean;
    country: string | null;
    info_page_available: boolean;
    created_at: string;
}

const parseServerCheck = (row: Row): ServerCheck => {
    const status = row as unknown as StatusRow;
    return {
        uuid: status.uuid,
        serverUuid: status.server_uuid,
        status: status.status,
        country: status.country ?? '',
        infoPageAvailable: status.info_page_available,
        createdAt: new Date(status.created_at),
    };
};

export class SupabaseServers implements ServersRead {
    constructor(private readonly client: SupabaseClient) {}

    list(query: ServerQuery, page: Page): Promise<Result<PageOf<Server>>> {
        return attempt(async () => {
            const summaries = await readPage(
                head => this.client.from('v_server_summaries').select(SERVER_SUMMARY, { count: 'exact', head }),
                q => {
                    if (query.uuid) q = q.eq('server_uuid', query.uuid);
                    if (query.host) q = q.ilike('server_hosts.host', `%${query.host}%`);
                    if (query.identity) q = q.ilike('server_identities.identity', `%${query.identity}%`);
                    if (query.minUptime7 !== undefined) q = q.gte('uptime7', query.minUptime7);
                    if (query.minUptime30 !== undefined) q = q.gte('uptime30', query.minUptime30);
                    if (query.minUptime90 !== undefined) q = q.gte('uptime90', query.minUptime90);
                    return q.order('server_uuid');
                },
                page,
                row => row as unknown as SummaryRow,
            );
            if (!summaries.ok) return summaries;

            const rows = summaries.value.items;
            const statusUuids = [...new Set(rows.map(row => row.last_server_status_uuid).filter((uuid): uuid is string => !!uuid))];
            const answers = await Promise.all(chunks(statusUuids).map(chunk => this.client
                .from('server_statuses')
                .select('uuid, server_uuid, status, country, info_page_available, created_at')
                .in('uuid', chunk)
                .range(0, chunk.length - 1)));
            const latest = new Map<string, StatusRow>();
            for (const { data, error } of answers) {
                if (error) return err(error.message);
                for (const status of data as StatusRow[]) latest.set(status.uuid, status);
            }

            return ok({
                total: summaries.value.total,
                items: rows.map(row => {
                    const status = row.last_server_status_uuid ? latest.get(row.last_server_status_uuid) : undefined;
                    const self = row.servers?.find(s => s.uuid === row.server_uuid);
                    return {
                        uuid: row.server_uuid,
                        protocol: self?.protocol === 2 ? 'xftp' : 'smp',
                        host: row.host,
                        identity: row.identity,
                        status: status ? status.status : null,
                        country: status?.country ?? '',
                        infoPageAvailable: status?.info_page_available ?? false,
                        uptime7: row.uptime7,
                        uptime30: row.uptime30,
                        uptime90: row.uptime90,
                        lastCheck: date(status?.created_at),
                        createdAt: self?.created_at ? new Date(self.created_at) : new Date(0),
                    };
                }),
            });
        });
    }

    checks(serverUuids: string[], page: Page): Promise<Result<PageOf<ServerCheck>>> {
        return attempt(async () => {
            if (serverUuids.length === 0) return ok({ items: [], total: 0 });
            return readPage(
                head => this.client.from('server_statuses').select('*', { count: 'exact', head }),
                q => q.in('server_uuid', serverUuids).order('created_at', { ascending: true }).order('uuid'),
                page,
                parseServerCheck,
            );
        });
    }

    countWithIdentity(identity: string, except: string): Promise<Result<number>> {
        return attempt(async () => {
            const { data: identityRow, error: identityError } = await this.client
                .from('server_identities')
                .select('uuid')
                .eq('identity', identity)
                .maybeSingle();
            if (identityError) return err(identityError.message);
            if (!identityRow) return ok(0);

            const { count, error } = await this.client
                .from('servers')
                .select('*', { count: 'exact', head: true })
                .eq('identity_uuid', identityRow.uuid)
                .neq('uuid', except);
            if (error) return err(error.message);
            return ok(count ?? 0);
        });
    }

    /**
     * Counted here from every server's latest check, read a page of servers at a time: the latest check is the
     * one embedded by `created_at` descending, limited to one, a single request for a page.
     */
    countries(page: Page): Promise<Result<PageOf<CountryCount>>> {
        return attempt(async () => {
            const byCountry = new Map<string, CountryCount>();
            const read = { size: 1000, number: 1 };
            for (;;) {
                const servers = await readPage(
                    head => this.client.from('servers').select('uuid, server_statuses(status, country)', { count: 'exact', head }),
                    q => q
                        .order('created_at', { referencedTable: 'server_statuses', ascending: false })
                        .limit(1, { referencedTable: 'server_statuses' })
                        .order('uuid'),
                    read,
                    row => (row.server_statuses as { status: unknown; country: unknown }[] | null)?.[0],
                );
                if (!servers.ok) return servers;
                for (const latest of servers.value.items) {
                    if (!latest || typeof latest.status !== 'boolean' || typeof latest.country !== 'string') continue;
                    const count = byCountry.get(latest.country) ?? { country: latest.country, active: 0, inactive: 0 };
                    count[latest.status ? 'active' : 'inactive'] += 1;
                    byCountry.set(latest.country, count);
                }
                if (read.size * read.number >= servers.value.total) break;
                read.number += 1;
            }
            const all = [...byCountry.values()].sort((a, b) => a.country < b.country ? -1 : a.country > b.country ? 1 : 0);
            const [from, to] = rangeOf(page);
            return ok({ items: all.slice(from, to + 1), total: all.length });
        });
    }
}

// ---- Bots

const parseBot = (row: Row): Bot => ({
    uuid: row.uuid as string,
    address: row.address as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    photo: (row.photo as string | null) ?? null,
    status: (row.is_online as boolean | null) ?? null,
    uptime7: row.uptime7 as number,
    uptime30: row.uptime30 as number,
    uptime90: row.uptime90 as number,
    lastCheck: date(row.last_check),
    createdAt: new Date(row.created_at as string),
});

const BOTS_SORT_COLUMN: Record<BotsSortField, string> = {
    is_online: 'is_online',
    address: 'address',
    uptime7: 'uptime7',
    uptime30: 'uptime30',
    uptime90: 'uptime90',
    lastCheck: 'last_check',
};

export class SupabaseBots implements BotsRead {
    constructor(private readonly client: SupabaseClient) {}

    list(filter: BotsFilter, sort: Sort<BotsSortField>, page: Page): Promise<Result<PageOf<Bot>>> {
        return attempt(() => readPage(
            head => this.client.from('v_bot_summaries').select('*', { count: 'exact', head }),
            q => {
                if (filter.status !== undefined) q = q.eq('is_online', filter.status);
                q = byUuids(q, filter.uuids);
                if (filter.text) q = q.or(`name.ilike.%${filter.text}%,description.ilike.%${filter.text}%`);
                q = atLeast(q, filter);
                return q.order(BOTS_SORT_COLUMN[sort.field], { ascending: sort.order === 'asc' }).order('uuid');
            },
            page,
            parseBot,
        ));
    }

    details(botUuid: string): Promise<Result<BotDetails | null>> {
        return attempt(async () => {
            const { data, error } = await this.client
                .from('bots')
                .select(`
                    uuid,
                    bot_greeting_messages!bot_greeting_messages_bot_uuid_fkey (*),
                    bot_profiles!bot_profiles_bot_uuid_fkey (
                        *,
                        bot_commands (*)
                    )
                `)
                .eq('uuid', botUuid)
                .maybeSingle();
            if (error) return err(error.message);
            if (!data) return ok(null);

            const bot = data as unknown as {
                uuid: string;
                bot_greeting_messages: { text?: string } | null;
                bot_profiles: { bot_commands?: { keyword: string; label: string }[] } | null;
            };
            return ok({
                botUuid: bot.uuid,
                greetingMessage: bot.bot_greeting_messages?.text,
                commands: (bot.bot_profiles?.bot_commands ?? []).map(({ keyword, label }) => ({ keyword, label })),
            });
        });
    }

    checks(botUuids: string[], page: Page): Promise<Result<PageOf<BotCheck>>> {
        return attempt(async () => {
            if (botUuids.length === 0) return ok({ items: [], total: 0 });
            return readPage(
                head => this.client.from('bot_statuses').select('*', { count: 'exact', head }),
                q => q.in('bot_uuid', botUuids).order('created_at', { ascending: true }).order('uuid'),
                page,
                row => ({
                    uuid: row.uuid as string,
                    botUuid: row.bot_uuid as string,
                    status: row.is_online as boolean,
                    createdAt: new Date(row.created_at as string),
                }),
            );
        });
    }
}

// ---- Relays

const parseRelay = (row: Row): Relay => ({
    uuid: row.uuid as string,
    url: row.url as string,
    name: row.name as string,
    photo: (row.photo as string | null) ?? null,
    status: (row.is_online as boolean | null) ?? null,
    uptime7: row.uptime7 as number,
    uptime30: row.uptime30 as number,
    uptime90: row.uptime90 as number,
    lastCheck: date(row.last_check),
    createdAt: new Date(row.created_at as string),
});

export class SupabaseRelays implements RelaysRead {
    constructor(private readonly client: SupabaseClient) {}

    list(filter: RelaysFilter, sort: Sort<RelaysSortField>, page: Page): Promise<Result<PageOf<Relay>>> {
        return attempt(() => readPage(
            head => this.client.from('v_relays_summaries').select('*', { count: 'exact', head }),
            q => {
                if (filter.status !== undefined) q = q.eq('is_online', filter.status);
                q = byUuids(q, filter.uuids);
                if (filter.url) q = q.ilike('url', `%${filter.url}%`);
                if (filter.name) q = q.ilike('name', `%${filter.name}%`);
                q = atLeast(q, filter);
                return q.order(sort.field, { ascending: sort.order === 'asc' }).order('uuid');
            },
            page,
            parseRelay,
        ));
    }

    checks(relayUuids: string[], page: Page): Promise<Result<PageOf<RelayCheck>>> {
        return attempt(async () => {
            if (relayUuids.length === 0) return ok({ items: [], total: 0 });
            return readPage(
                head => this.client.from('relay_statuses').select('*', { count: 'exact', head }),
                q => q.in('relay_uuid', relayUuids).order('created_at', { ascending: true }).order('uuid'),
                page,
                row => ({
                    uuid: row.uuid as string,
                    relayUuid: row.relay_uuid as string,
                    status: row.is_online as boolean,
                    createdAt: new Date(row.created_at as string),
                }),
            );
        });
    }
}
