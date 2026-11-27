// What the website's pages ask of its logic, one interface per thing a visitor does. The logic implements
// these over the outbound ports; the pages call these and nothing else. What can fail gives a `Result`, and a
// list is a page of it (`types.ts`).

import type {
    Bot, BotCheck, BotDetails, BotsFilter, BotsSortField, CountryCount, Labels, ListName, Page, PageOf, Relay,
    RelayCheck, RelaysFilter, RelaysSortField, Result, Server, ServerCheck, ServersFilter, ServersSortField, Sort,
    WorldTopology,
} from './types';

/** The servers' table, a server's page and the counts (US-B1…US-B29, US-B40…US-B42). */
export interface ServersCatalog {
    /**
     * The page of the servers the filter lets through, sorted, and how many it lets through in all. Filtering
     * by status, type, location, info page and the visitor's labels, the sort and the page are the website's,
     * so it reads every page of the servers the backend has.
     */
    list(filter: ServersFilter, sort: Sort<ServersSortField>, page: Page): Promise<Result<PageOf<Server>>>;

    /** The server of that id; `null` when the catalog has none (US-B42). */
    server(uuid: string): Promise<Result<Server | null>>;

    /** The page of the checks of the servers given, oldest first (US-B35, US-B40). */
    checks(serverUuids: string[], page: Page): Promise<Result<PageOf<ServerCheck>>>;

    /** How many other servers have the identity of this one (US-B40). */
    othersWithIdentity(server: Server): Promise<Result<number>>;

    /** The page of the servers online and offline per location, for the counts, the map and the locations (US-B1…US-B4, US-B16). */
    countries(page: Page): Promise<Result<PageOf<CountryCount>>>;
}

/** The bots' cards and a bot's page (US-C1…US-C15). */
export interface BotsCatalog {
    /**
     * The page of the bots the filter lets through, sorted, and how many it lets through in all; when the
     * filter lets none through, `total` is that of the last list that found some (US-C8).
     */
    list(filter: BotsFilter, sort: Sort<BotsSortField>, page: Page): Promise<Result<PageOf<Bot>>>;

    /** The bot of that id; `null` when the catalog lists none (US-C15). */
    bot(uuid: string): Promise<Result<Bot | null>>;

    /** The commands and first message of a bot; `null` when the catalog lists no such bot (US-C12, US-C23). */
    details(uuid: string): Promise<Result<BotDetails | null>>;

    /** The page of the checks of the bots given, oldest first (US-C12, US-C28). */
    checks(botUuids: string[], page: Page): Promise<Result<PageOf<BotCheck>>>;
}

/** The relays' table and a relay's page (US-D1…US-D16). */
export interface RelaysCatalog {
    /** The page of the relays the filter lets through, sorted, and how many it lets through in all. */
    list(filter: RelaysFilter, sort: Sort<RelaysSortField>, page: Page): Promise<Result<PageOf<Relay>>>;

    /** The relay of that id; `null` when the catalog lists none (US-D16). */
    relay(uuid: string): Promise<Result<Relay | null>>;

    /** The page of the checks of the relays given, oldest first (US-D14, US-D24). */
    checks(relayUuids: string[], page: Page): Promise<Result<PageOf<RelayCheck>>>;
}

/**
 * What a visitor adds. Each is `ok` once the catalog has taken it; otherwise its error is what the website
 * tells the visitor (US-B43…US-B47, US-C16…US-C21, US-D17…US-D21).
 */
export interface Adding {
    addServer(uri: string): Promise<Result<void>>;
    addBot(url: string): Promise<Result<void>>;
    addRelay(url: string): Promise<Result<void>>;
}

/** The labels a visitor gives servers (US-B30…US-B33, US-B38). */
export interface ServerLabels {
    /** The labels as they are now on the page. */
    current(): Labels;

    /** Sets the label on the server, or clears it when it has it, and saves all the labels in the browser (US-B30). */
    toggle(serverUuid: string, label: string): void;

    /** Sets the `added` label on the server on the page, without saving it: the next saving takes it along (US-B38). */
    markAdded(serverUuid: string): void;

    /** Makes the browser save the labels as `<host>_labels_<time>.json` (US-B31). */
    export(): void;

    /** Lets the visitor choose a labels file, and gives what it holds; `null` when none is chosen, an error when it cannot be read (US-B32). */
    read(): Promise<Result<Labels | null>>;

    /** Puts these labels in place of the visitor's, and saves them (US-B32). */
    replace(labels: Labels): void;
}

/** The filters a list was last left with, in this browser (US-B23, US-C10, US-D10). */
export interface RememberedFilters {
    /** `null` when the list was never filtered here. */
    recall(list: ListName): unknown | null;
    remember(list: ListName, filters: unknown): void;
}

/** What a visitor copies with a click (US-B6, US-C14, US-D2, US-D15). */
export interface Copying {
    copy(text: string): Promise<Result<void>>;
}

/** The world map of the servers (US-B2). */
export interface WorldShapes {
    /** An error when they cannot be had, and the map says so. */
    countries(): Promise<Result<WorldTopology>>;
}

export interface InboundPorts {
    servers: ServersCatalog;
    bots: BotsCatalog;
    relays: RelaysCatalog;
    adding: Adding;
    labels: ServerLabels;
    filters: RememberedFilters;
    copying: Copying;
    world: WorldShapes;
}
