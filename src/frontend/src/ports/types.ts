// The values the website's ports exchange: what a page shows of a server, a bot and a relay, what a list is
// asked for, and what the visitor keeps.

// ---- What every port gives

/**
 * What a port gives when what it does can fail: `ok` and the value, or not `ok` and why, in words the website
 * can show the visitor. A port never throws and its promise never rejects: a failure is this, and nothing else.
 */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

// ---- Lists

export interface Sort<Field> {
    field: Field;
    order: 'asc' | 'desc';
}

/**
 * A page of a list: its size, and its number from 1. Every port that gives a list is asked for a page of it
 * and gives `PageOf`, so no list is cut short where nobody sees it.
 */
export interface Page {
    size: number;
    number: number;
}

/** One page of a list, and how many the list holds in all. */
export interface PageOf<T> {
    items: T[];
    total: number;
}

/** A filter of a list by values: only those with one of them (`inclusive`), or only those with none. */
export interface FilterArray {
    inclusive: boolean;
    values: string[];
}

// ---- Servers

export type Protocol = 'smp' | 'xftp';

/** A server as the table and its page show it: the server, its latest check folded in, and its uptime. */
export interface Server {
    uuid: string;
    protocol: Protocol;
    host: string;
    identity: string;
    /** At its latest check: online, offline, or `null` before its first check. */
    status: boolean | null;
    /** The location of its latest check (`DE`, `TOR`, `I2P`, `YGGDRASIL`); empty before its first check. */
    country: string;
    infoPageAvailable: boolean;
    /** The share of the period the server was online, 0 to 1; `null` for a period with no check (US-B51). */
    uptime7: number | null;
    uptime30: number | null;
    uptime90: number | null;
    /** When it was last checked; `null` before its first check. */
    lastCheck: Date | null;
    /** When it was added. */
    createdAt: Date;
}

/** One check of a server (US-B40, US-B48). */
export interface ServerCheck {
    uuid: string;
    serverUuid: string;
    status: boolean;
    country: string;
    infoPageAvailable: boolean;
    createdAt: Date;
}

/** How many servers were found online and offline in a location at their latest check (US-B1, US-B2). */
export interface CountryCount {
    country: string;
    active: number;
    inactive: number;
}

/** What the backend is asked to narrow the servers to; each part left out narrows nothing. */
export interface ServerQuery {
    uuid?: string;
    /** Servers whose host contains it, in any case (US-B11). */
    host?: string;
    /** Servers whose identity contains it, in any case (US-B12). */
    identity?: string;
    /** Servers whose uptime over the period is at least it, 0 to 1 (US-B21). */
    minUptime7?: number;
    minUptime30?: number;
    minUptime90?: number;
}

/** The filters of the servers' table (US-B10…US-B26), as the page's address and the visitor's browser keep them. */
export interface ServersFilter {
    labels?: FilterArray;
    /** `'unknown'`, for the servers not checked yet, is read back from the page's address as no filter (US-B14). */
    status?: boolean | 'unknown';
    countries?: FilterArray;
    identity?: string;
    uuid?: string;
    infoPageAvailable?: boolean;
    host?: string;
    protocol?: Protocol;
    uptime7?: number;
    uptime30?: number;
    uptime90?: number;
}

export type ServersSortField =
    | 'status' | 'host' | 'identity' | 'country' | 'protocol'
    | 'uptime7' | 'uptime30' | 'uptime90' | 'last_check' | 'info_page_available' | 'created_at';

// ---- Bots

/** A bot as its card and its page show it: its profile, its latest check and its uptime. */
export interface Bot {
    uuid: string;
    /** The address it was added with, which **Visit** and **Open the bot** open. */
    address: string;
    name: string;
    description: string | null;
    /** Its image, as a data URI; `null` for none. */
    photo: string | null;
    /** At its latest check: online, offline, or `null` before its first check. */
    status: boolean | null;
    /** The share of the checks of the period that found it online, 0 to 1; 0 for a period with none (US-C28). */
    uptime7: number;
    uptime30: number;
    uptime90: number;
    lastCheck: Date | null;
    createdAt: Date;
}

export interface BotCommand {
    keyword: string;
    label: string;
}

/** What a bot's page shows beyond its card (US-C12). */
export interface BotDetails {
    botUuid: string;
    /** What it wrote first to whoever connected; absent when it wrote nothing. */
    greetingMessage?: string;
    commands: BotCommand[];
}

/** One check of a bot (US-C12, US-C28). */
export interface BotCheck {
    uuid: string;
    botUuid: string;
    status: boolean;
    createdAt: Date;
}

/** The filters of the bots' cards (US-C6, US-C7), and what the backend is asked to narrow them to. */
export interface BotsFilter {
    /** Bots online, or offline, at their latest check; left out, all. */
    status?: boolean;
    /** Bots whose name or description contains it, in any case. */
    text?: string;
    uuids?: FilterArray;
    uptime7?: number;
    uptime30?: number;
    uptime90?: number;
}

export type BotsSortField = 'is_online' | 'address' | 'uptime7' | 'uptime30' | 'uptime90' | 'lastCheck';

// ---- Relays

/** A relay as its row and its page show it: its profile, its latest check and its uptime. */
export interface Relay {
    uuid: string;
    url: string;
    name: string;
    /** Its image, as a data URI; `null` for none. */
    photo: string | null;
    /** At its latest check: online or offline. */
    status: boolean | null;
    /** The share of the checks of the period that found it online, 0 to 1; 0 for a period with none (US-D24). */
    uptime7: number;
    uptime30: number;
    uptime90: number;
    lastCheck: Date | null;
    createdAt: Date;
}

/** One check of a relay (US-D14, US-D24). */
export interface RelayCheck {
    uuid: string;
    relayUuid: string;
    status: boolean;
    createdAt: Date;
}

/** The filters of the relays' table (US-D6…US-D10), and what the backend is asked to narrow them to. */
export interface RelaysFilter {
    /** Relays online, or offline, at their latest check; left out, all. */
    status?: boolean;
    /** Relays whose address contains it, in any case. */
    url?: string;
    /** Relays whose name contains it, in any case. */
    name?: string;
    uuids?: FilterArray;
    uptime7?: number;
    uptime30?: number;
    uptime90?: number;
}

export type RelaysSortField = 'is_online' | 'url' | 'name' | 'uptime7' | 'uptime30' | 'uptime90' | 'last_check' | 'created_at';

// ---- The visitor's

/** The lists whose filters the browser remembers. */
export type ListName = 'servers' | 'bots' | 'relays';

/** The labels a visitor gives servers, `added` (✅) and `ignored` (🚫): for each, the ids of the servers that have it (US-B30). */
export type Labels = Record<string, string[]>;

// ---- The world map

/** A TopoJSON topology whose `countries` object holds a geometry per country, its `id` the country's numeric ISO code. */
export interface WorldTopology {
    type: 'Topology';
    objects: { countries: unknown };
    arcs: unknown[];
    transform?: unknown;
}
