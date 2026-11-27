// In-memory fakes of the outbound ports, for the logic's tests. A fake that has `failure` set answers every call
// with that error, as an adapter does when what is behind it fails.

import type {
    Bot, BotCheck, BotDetails, BotsFilter, BotsRead, BotsSortField, Clipboard, CountryCount, Files, Labels,
    ListName, Page, PageOf, Relay, RelayCheck, RelaysFilter, RelaysRead, RelaysSortField, Result, Server,
    ServerCheck, ServerQuery, ServersRead, Sort, Submission, VisitorStorage, WorldMap, WorldTopology,
} from '../ports';

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const err = (error: string): Result<never> => ({ ok: false, error });

export function unwrap<T>(result: Result<T>): T {
    if (!result.ok) throw new Error(`expected ok, got error: ${result.error}`);
    return result.value;
}

export function pageOf<T>(all: T[], page: Page): PageOf<T> {
    const start = page.size * (page.number - 1);
    return { items: all.slice(start, start + page.size), total: all.length };
}

export const server = (uuid: string, over: Partial<Server> = {}): Server => ({
    uuid,
    protocol: 'smp',
    host: `${uuid}.example.com`,
    identity: `identity-${uuid}`,
    status: true,
    country: 'DE',
    infoPageAvailable: false,
    uptime7: 1,
    uptime30: 1,
    uptime90: 1,
    lastCheck: new Date('2026-11-25T10:00:00Z'),
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...over,
});

export const bot = (uuid: string, over: Partial<Bot> = {}): Bot => ({
    uuid,
    address: `https://smp.example.com/a#${uuid}`,
    name: `Bot ${uuid}`,
    description: null,
    photo: null,
    status: true,
    uptime7: 1,
    uptime30: 1,
    uptime90: 1,
    lastCheck: new Date('2026-11-25T10:00:00Z'),
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...over,
});

export const relay = (uuid: string, over: Partial<Relay> = {}): Relay => ({
    uuid,
    url: `https://${uuid}.example.com/r#key`,
    name: `Relay ${uuid}`,
    photo: null,
    status: true,
    uptime7: 1,
    uptime30: 1,
    uptime90: 1,
    lastCheck: new Date('2026-11-25T10:00:00Z'),
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...over,
});

const lower = (s: string) => s.toLowerCase();

export class FakeServersRead implements ServersRead {
    servers: Server[] = [];
    serverChecks: ServerCheck[] = [];
    countryCounts: CountryCount[] = [];
    identityCount = 0;
    failure: string | null = null;
    /** Fails the call that asks for this page number of `list`, and no other. */
    failOnPage: number | null = null;
    listCalls: { query: ServerQuery; page: Page }[] = [];
    identityCalls: { identity: string; except: string }[] = [];

    async list(query: ServerQuery, page: Page): Promise<Result<PageOf<Server>>> {
        this.listCalls.push({ query, page });
        if (this.failure) return err(this.failure);
        if (this.failOnPage === page.number) return err('page failed');
        const matching = this.servers
            .filter(s => query.uuid === undefined || s.uuid === query.uuid)
            .filter(s => query.host === undefined || lower(s.host).includes(lower(query.host)))
            .filter(s => query.identity === undefined || lower(s.identity).includes(lower(query.identity)))
            .filter(s => query.minUptime7 === undefined || (s.uptime7 !== null && s.uptime7 >= query.minUptime7))
            .filter(s => query.minUptime30 === undefined || (s.uptime30 !== null && s.uptime30 >= query.minUptime30))
            .filter(s => query.minUptime90 === undefined || (s.uptime90 !== null && s.uptime90 >= query.minUptime90))
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        return ok(pageOf(matching, page));
    }

    async checks(serverUuids: string[], page: Page): Promise<Result<PageOf<ServerCheck>>> {
        if (this.failure) return err(this.failure);
        return ok(pageOf(this.serverChecks.filter(c => serverUuids.includes(c.serverUuid)), page));
    }

    async countWithIdentity(identity: string, except: string): Promise<Result<number>> {
        this.identityCalls.push({ identity, except });
        if (this.failure) return err(this.failure);
        return ok(this.identityCount);
    }

    async countries(page: Page): Promise<Result<PageOf<CountryCount>>> {
        if (this.failure) return err(this.failure);
        return ok(pageOf(this.countryCounts, page));
    }
}

export class FakeBotsRead implements BotsRead {
    /** What `list` gives for the next calls: by default, `bots` narrowed by `uuids` and by `status`, then paged. */
    bots: Bot[] = [];
    botDetails: BotDetails[] = [];
    botChecks: BotCheck[] = [];
    failure: string | null = null;
    listCalls: { filter: BotsFilter; sort: Sort<BotsSortField>; page: Page }[] = [];

    async list(filter: BotsFilter, sort: Sort<BotsSortField>, page: Page): Promise<Result<PageOf<Bot>>> {
        this.listCalls.push({ filter, sort, page });
        if (this.failure) return err(this.failure);
        const matching = this.bots
            .filter(b => filter.status === undefined || b.status === filter.status)
            .filter(b => !filter.uuids || filter.uuids.values.includes(b.uuid) === filter.uuids.inclusive)
            .filter(b => !filter.text || lower(`${b.name} ${b.description ?? ''}`).includes(lower(filter.text)));
        return ok(pageOf(matching, page));
    }

    async details(botUuid: string): Promise<Result<BotDetails | null>> {
        if (this.failure) return err(this.failure);
        return ok(this.botDetails.find(d => d.botUuid === botUuid) ?? null);
    }

    async checks(botUuids: string[], page: Page): Promise<Result<PageOf<BotCheck>>> {
        if (this.failure) return err(this.failure);
        return ok(pageOf(this.botChecks.filter(c => botUuids.includes(c.botUuid)), page));
    }
}

export class FakeRelaysRead implements RelaysRead {
    relays: Relay[] = [];
    relayChecks: RelayCheck[] = [];
    failure: string | null = null;
    listCalls: { filter: RelaysFilter; sort: Sort<RelaysSortField>; page: Page }[] = [];

    async list(filter: RelaysFilter, sort: Sort<RelaysSortField>, page: Page): Promise<Result<PageOf<Relay>>> {
        this.listCalls.push({ filter, sort, page });
        if (this.failure) return err(this.failure);
        const matching = this.relays
            .filter(r => filter.status === undefined || r.status === filter.status)
            .filter(r => !filter.uuids || filter.uuids.values.includes(r.uuid) === filter.uuids.inclusive);
        return ok(pageOf(matching, page));
    }

    async checks(relayUuids: string[], page: Page): Promise<Result<PageOf<RelayCheck>>> {
        if (this.failure) return err(this.failure);
        return ok(pageOf(this.relayChecks.filter(c => relayUuids.includes(c.relayUuid)), page));
    }
}

export class FakeSubmission implements Submission {
    /** What the backend answers, by what was entered; anything else it takes. */
    answers = new Map<string, string>();
    entered: { kind: 'server' | 'bot' | 'relay'; text: string }[] = [];

    private answer(kind: 'server' | 'bot' | 'relay', text: string): Result<void> {
        this.entered.push({ kind, text });
        const error = this.answers.get(text);
        return error === undefined ? ok(undefined) : err(error);
    }

    async addServer(uri: string) { return this.answer('server', uri); }
    async addBot(url: string) { return this.answer('bot', url); }
    async addRelay(url: string) { return this.answer('relay', url); }
}

export class FakeStorage implements VisitorStorage {
    filters = new Map<ListName, unknown>();
    labels: Labels | null = null;
    loadFailure: string | null = null;
    saveFailure: string | null = null;
    labelSaves: Labels[] = [];

    loadFilters(list: ListName): Result<unknown | null> {
        if (this.loadFailure) return err(this.loadFailure);
        return ok(this.filters.has(list) ? this.filters.get(list) : null);
    }

    saveFilters(list: ListName, filters: unknown): Result<void> {
        if (this.saveFailure) return err(this.saveFailure);
        // What the browser keeps is text, so what comes back is what the text holds.
        this.filters.set(list, JSON.parse(JSON.stringify(filters)));
        return ok(undefined);
    }

    loadLabels(): Result<Labels | null> {
        if (this.loadFailure) return err(this.loadFailure);
        return ok(this.labels);
    }

    saveLabels(labels: Labels): Result<void> {
        if (this.saveFailure) return err(this.saveFailure);
        this.labels = JSON.parse(JSON.stringify(labels));
        this.labelSaves.push(JSON.parse(JSON.stringify(labels)));
        return ok(undefined);
    }
}

export class FakeClipboard implements Clipboard {
    copied: string[] = [];
    failure: string | null = null;

    async copy(text: string): Promise<Result<void>> {
        if (this.failure) return err(this.failure);
        this.copied.push(text);
        return ok(undefined);
    }
}

export class FakeFiles implements Files {
    saved: { name: string; contents: string; type: string }[] = [];
    /** What the visitor chooses next: a text, `null` for none, or an error. */
    chosen: Result<string | null> = ok(null);
    opened: string[] = [];

    save(name: string, contents: string, type: string): void {
        this.saved.push({ name, contents, type });
    }

    async open(type: string): Promise<Result<string | null>> {
        this.opened.push(type);
        return this.chosen;
    }
}

export class FakeWorldMap implements WorldMap {
    topology: Result<WorldTopology> = ok({ type: 'Topology', objects: { countries: {} }, arcs: [] });

    async countries(): Promise<Result<WorldTopology>> {
        return this.topology;
    }
}
