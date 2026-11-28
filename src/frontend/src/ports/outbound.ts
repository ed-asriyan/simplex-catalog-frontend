// What the website needs from outside: the backend, the visitor's browser, the world map. The adapters
// implement these; the website's logic calls them, and nothing else of it reaches outside. What can fail gives
// a `Result`, and a list is a page of it (`types.ts`): an adapter catches what is thrown behind it.

import type {
    Bot, BotCheck, BotDetails, BotsFilter, BotsSortField, CountryCount, Labels, ListName, Page, PageOf, Relay,
    RelayCheck, RelaysFilter, RelaysSortField, Result, Server, ServerCheck, ServerQuery, Sort, WorldTopology,
} from './types';

/** The catalog's servers, as the backend has them. */
export interface ServersRead {
    /** The page of the servers the query lets through, in an order that stays the same from page to page, and how many it lets through in all (US-B5, US-B10…US-B29, US-B40). */
    list(query: ServerQuery, page: Page): Promise<Result<PageOf<Server>>>;

    /** The page of the checks of the servers given, oldest first (US-B35, US-B40). */
    checks(serverUuids: string[], page: Page): Promise<Result<PageOf<ServerCheck>>>;

    /** How many servers have this identity, the server `except` not counted (US-B40). */
    countWithIdentity(identity: string, except: string): Promise<Result<number>>;

    /** The page of the servers online and offline at their latest check, per location; a location none was checked in is not in it (US-B1…US-B4, US-B16). */
    countries(page: Page): Promise<Result<PageOf<CountryCount>>>;
}

/** The catalog's bots, as the backend has them: approved bots only. */
export interface BotsRead {
    /** The page of the bots the filter lets through, sorted, and how many it lets through in all (US-C1, US-C6…US-C11). */
    list(filter: BotsFilter, sort: Sort<BotsSortField>, page: Page): Promise<Result<PageOf<Bot>>>;

    /** The commands and first message of a bot; `null` when the backend knows no such bot (US-C12, US-C15, US-C23). */
    details(botUuid: string): Promise<Result<BotDetails | null>>;

    /** The page of the checks of the bots given, oldest first (US-C12, US-C28). */
    checks(botUuids: string[], page: Page): Promise<Result<PageOf<BotCheck>>>;
}

/** The catalog's relays, as the backend has them: those a check has reached. */
export interface RelaysRead {
    /** The page of the relays the filter lets through, sorted, and how many it lets through in all (US-D1, US-D6…US-D13). */
    list(filter: RelaysFilter, sort: Sort<RelaysSortField>, page: Page): Promise<Result<PageOf<Relay>>>;

    /** The page of the checks of the relays given, oldest first (US-D14, US-D24). */
    checks(relayUuids: string[], page: Page): Promise<Result<PageOf<RelayCheck>>>;
}

/**
 * Hands the backend what a visitor entered. Each is `ok` once the backend has taken it; otherwise its error is
 * the backend's answer, to show as it is (US-B47, US-C18, US-C20, US-D20).
 */
export interface Submission {
    addServer(uri: string): Promise<Result<void>>;
    addBot(url: string): Promise<Result<void>>;
    addRelay(url: string): Promise<Result<void>>;
}

/**
 * What the browser keeps of the visitor's own, there between visits, for this visitor only. What earlier
 * visits kept is read as they left it (US-B23, US-B30, US-B38, US-C10, US-D10).
 */
export interface VisitorStorage {
    /** The filters of a list as they were saved last; `null` when there are none, an error when the browser does not let them be read. */
    loadFilters(list: ListName): Result<unknown | null>;
    /** An error when the browser did not keep them. */
    saveFilters(list: ListName, filters: unknown): Result<void>;

    /** The labels of the servers; `null` when there are none, an error when the browser does not let them be read. */
    loadLabels(): Result<Labels | null>;
    /** An error when the browser did not keep them. */
    saveLabels(labels: Labels): Result<void>;
}

/** The visitor's clipboard (US-B6, US-C14, US-D2, US-D15). */
export interface Clipboard {
    /** An error when the browser did not let it be written. */
    copy(text: string): Promise<Result<void>>;
}

/** The files a visitor saves and opens (US-B31, US-B32). */
export interface Files {
    /** Makes the browser save the contents as a file of that name and type. */
    save(name: string, contents: string, type: string): void;

    /** Lets the visitor choose a file of that type, and gives its text; `null` when none is chosen, an error when it cannot be read. */
    open(type: string): Promise<Result<string | null>>;
}

/** The shapes of the world's countries. */
export interface WorldMap {
    /** An error when they cannot be had, and the map says so (US-B2). */
    countries(): Promise<Result<WorldTopology>>;
}

/** Where the website is served from, and what time it is there: they name the file the labels are saved to (US-B31). */
export interface Environment {
    /** The host the website is served from. */
    host: string;
    now(): Date;
}

export interface OutboundPorts {
    servers: ServersRead;
    bots: BotsRead;
    relays: RelaysRead;
    submission: Submission;
    storage: VisitorStorage;
    clipboard: Clipboard;
    files: Files;
    worldMap: WorldMap;
    environment: Environment;
}
