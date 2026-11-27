import { beforeEach, describe, expect, it } from 'vitest';
import type { Server, ServersFilter, ServersSortField, Sort } from '../ports';
import { FakeServersRead, server, unwrap } from './fakes';
import type { Environment } from '../ports';
import { ServerLabels } from './server-labels';
import { ServersCatalog } from './servers-catalog';
import { FakeFiles, FakeStorage } from './fakes';

const environment: Environment = { host: 'simplex-catalog.asriyan.me', now: () => new Date('2026-11-25T10:00:00Z') };
const byHost: Sort<ServersSortField> = { field: 'host', order: 'asc' };

let read: FakeServersRead;
let labels: ServerLabels;
let catalog: ServersCatalog;

// A page of the visitor's whole list, as the table asks for it.
async function uuids(filter: ServersFilter, sort: Sort<ServersSortField> = byHost, size = 100, number = 1) {
    const page = unwrap(await catalog.list(filter, sort, { size, number }));
    return { uuids: page.items.map(s => s.uuid), total: page.total };
}

beforeEach(() => {
    read = new FakeServersRead();
    labels = new ServerLabels(new FakeStorage(), new FakeFiles(), environment);
    catalog = new ServersCatalog(read, labels);
});

describe('filters', () => {
    // US-B11
    it('narrows by host, in any case, asking the backend for it', async () => {
        read.servers = [server('a', { host: 'smp.Example.com' }), server('b', { host: 'other.org' })];
        expect((await uuids({ host: 'EXAMPLE' })).uuids).toEqual(['a']);
        expect(read.listCalls.every(c => c.query.host === 'EXAMPLE')).toBe(true);
    });

    // US-B12
    it('narrows by identity, in any case', async () => {
        read.servers = [server('a', { identity: '64jcSfg' }), server('b', { identity: 'zzz' })];
        expect((await uuids({ identity: '64JC' })).uuids).toEqual(['a']);
    });

    // US-B13
    it('narrows by type', async () => {
        read.servers = [server('a', { protocol: 'smp' }), server('b', { protocol: 'xftp' })];
        expect((await uuids({ protocol: 'xftp' })).uuids).toEqual(['b']);
        expect((await uuids({ protocol: 'smp' })).uuids).toEqual(['a']);
        expect((await uuids({})).uuids).toEqual(['a', 'b']);
    });

    // US-B14
    it('narrows by the status at the latest check', async () => {
        read.servers = [server('on', { status: true }), server('off', { status: false }), server('new', { status: null })];
        expect((await uuids({ status: true })).uuids).toEqual(['on']);
        expect((await uuids({ status: false })).uuids).toEqual(['off']);
        expect((await uuids({ status: 'unknown' })).uuids).toEqual(['new']);
        expect((await uuids({})).uuids).toEqual(['new', 'off', 'on']);
    });

    // US-B15
    it('narrows by the info page', async () => {
        read.servers = [server('yes', { infoPageAvailable: true }), server('no', { infoPageAvailable: false })];
        expect((await uuids({ infoPageAvailable: true })).uuids).toEqual(['yes']);
        expect((await uuids({ infoPageAvailable: false })).uuids).toEqual(['no']);
    });

    // US-B17
    it('hides the servers in the locations ticked when the filter is exclusive', async () => {
        read.servers = [server('de', { country: 'DE' }), server('jp', { country: 'JP' }), server('tor', { country: 'TOR' })];
        expect((await uuids({ countries: { inclusive: false, values: ['DE', 'TOR'] } })).uuids).toEqual(['jp']);
    });

    // US-B18
    it('shows only the servers in the locations ticked when the filter is inclusive', async () => {
        read.servers = [server('de', { country: 'DE' }), server('jp', { country: 'JP' }), server('tor', { country: 'TOR' })];
        expect((await uuids({ countries: { inclusive: true, values: ['DE', 'TOR'] } })).uuids).toEqual(['de', 'tor']);
    });

    // US-B20
    it('hides the servers the visitor labelled, or shows only them, by the labels as they are now', async () => {
        read.servers = [server('a'), server('b'), server('c')];
        labels.toggle('a', 'added');
        labels.toggle('b', 'ignored');
        expect((await uuids({ labels: { inclusive: false, values: ['added'] } })).uuids).toEqual(['b', 'c']);
        expect((await uuids({ labels: { inclusive: true, values: ['added'] } })).uuids).toEqual(['a']);
        expect((await uuids({ labels: { inclusive: true, values: ['added', 'ignored'] } })).uuids).toEqual(['a', 'b']);
    });

    // US-B38
    it('counts the server marked as added, though that is not saved', async () => {
        read.servers = [server('a'), server('b')];
        labels.markAdded('b');
        expect((await uuids({ labels: { inclusive: true, values: ['added'] } })).uuids).toEqual(['b']);
    });

    // US-B21
    it('narrows by the least uptime over each period, asking the backend for it', async () => {
        read.servers = [
            server('high', { uptime7: 0.95, uptime30: 0.9, uptime90: 0.9 }),
            server('low', { uptime7: 0.5, uptime30: 0.99, uptime90: 0.99 }),
            server('none', { uptime7: null, uptime30: null, uptime90: null }),
        ];
        expect((await uuids({ uptime7: 0.9 })).uuids).toEqual(['high']);
        expect((await uuids({ uptime30: 0.95 })).uuids).toEqual(['low']);
        expect((await uuids({ uptime90: 0.9 })).uuids).toEqual(['high', 'low']);
        expect(read.listCalls.at(-1)!.query.minUptime90).toBe(0.9);
    });

    // US-B21
    it('keeps a server with no uptime when no uptime is asked for', async () => {
        read.servers = [server('none', { uptime7: null })];
        expect((await uuids({})).uuids).toEqual(['none']);
    });

    // US-B10
    it('applies every filter set at once', async () => {
        read.servers = [
            server('match', { host: 'smp.example.com', protocol: 'smp', status: true, country: 'DE' }),
            server('wrongCountry', { host: 'smp.example.com', protocol: 'smp', status: true, country: 'JP' }),
            server('wrongStatus', { host: 'smp.example.com', protocol: 'smp', status: false, country: 'DE' }),
        ];
        const found = await uuids({ host: 'example', protocol: 'smp', status: true, countries: { inclusive: true, values: ['DE'] } });
        expect(found).toEqual({ uuids: ['match'], total: 1 });
    });
});

describe('sorts', () => {
    // US-B27
    it('sorts by a column, descending or ascending', async () => {
        read.servers = [server('a', { host: 'b.com' }), server('b', { host: 'c.com' }), server('c', { host: 'a.com' })];
        expect((await uuids({}, { field: 'host', order: 'asc' })).uuids).toEqual(['c', 'a', 'b']);
        expect((await uuids({}, { field: 'host', order: 'desc' })).uuids).toEqual(['b', 'a', 'c']);
    });

    // US-B27
    it('sorts by the last check, a server not checked yet before every checked one when ascending', async () => {
        read.servers = [
            server('late', { lastCheck: new Date('2026-11-25T10:00:00Z') }),
            server('never', { lastCheck: null, status: null }),
            server('early', { lastCheck: new Date('2026-11-24T10:00:00Z') }),
        ];
        expect((await uuids({}, { field: 'last_check', order: 'asc' })).uuids).toEqual(['never', 'early', 'late']);
        expect((await uuids({}, { field: 'last_check', order: 'desc' })).uuids).toEqual(['late', 'early', 'never']);
    });

    // US-B27
    it('sorts by when the server was added', async () => {
        read.servers = [
            server('b', { createdAt: new Date('2026-03-01T00:00:00Z') }),
            server('a', { createdAt: new Date('2026-02-01T00:00:00Z') }),
        ];
        expect((await uuids({}, { field: 'created_at', order: 'asc' })).uuids).toEqual(['a', 'b']);
    });

    // US-B27
    it('sorts by the status, an offline server before an online one when ascending, a server not checked first', async () => {
        read.servers = [server('on', { status: true }), server('new', { status: null }), server('off', { status: false })];
        expect((await uuids({}, { field: 'status', order: 'asc' })).uuids).toEqual(['new', 'off', 'on']);
    });

    // US-B27
    it('sorts by the info page, one without before one with when ascending', async () => {
        read.servers = [server('yes', { infoPageAvailable: true }), server('no', { infoPageAvailable: false })];
        expect((await uuids({}, { field: 'info_page_available', order: 'asc' })).uuids).toEqual(['no', 'yes']);
    });

    // US-B27
    it('sorts by the uptime, a server with none before the others when ascending', async () => {
        read.servers = [server('a', { uptime30: 0.9 }), server('none', { uptime30: null }), server('b', { uptime30: 0.5 })];
        expect((await uuids({}, { field: 'uptime30', order: 'asc' })).uuids).toEqual(['none', 'b', 'a']);
    });

    // US-B27
    it('sorts by the location and the type', async () => {
        read.servers = [
            server('jp', { country: 'JP', protocol: 'xftp' }),
            server('de', { country: 'DE', protocol: 'smp' }),
        ];
        expect((await uuids({}, { field: 'country', order: 'asc' })).uuids).toEqual(['de', 'jp']);
        expect((await uuids({}, { field: 'protocol', order: 'asc' })).uuids).toEqual(['de', 'jp']);
    });

    // US-B27
    it('sorts what is filtered, not what the backend holds', async () => {
        read.servers = [server('a', { host: 'a', status: false }), server('b', { host: 'b', status: true }), server('c', { host: 'c', status: true })];
        expect((await uuids({ status: true }, { field: 'host', order: 'desc' })).uuids).toEqual(['c', 'b']);
    });
});

describe('paging', () => {
    const many = (n: number): Server[] =>
        Array.from({ length: n }, (_, i) => server(`s${String(i).padStart(4, '0')}`, { host: `h${String(i).padStart(4, '0')}.com` }));

    // US-B28
    it('gives the page asked for, of the size asked for, and how many servers the filter lets through in all', async () => {
        read.servers = many(23);
        const first = await uuids({}, byHost, 10, 1);
        const third = await uuids({}, byHost, 10, 3);
        expect(first.uuids).toEqual(many(10).map(s => s.uuid));
        expect(third.uuids).toEqual(['s0020', 's0021', 's0022']);
        expect(first.total).toBe(23);
        expect(third.total).toBe(23);
    });

    // US-B29
    it('gives no server for a page past the last, and still the total', async () => {
        read.servers = many(5);
        expect(await uuids({}, byHost, 10, 2)).toEqual({ uuids: [], total: 5 });
    });

    // US-B29
    it('gives the total of the servers the filter lets through, not of those the backend holds', async () => {
        read.servers = [...many(7), ...many(7).map(s => ({ ...s, uuid: `x${s.uuid}`, status: false }))];
        expect((await uuids({ status: false }, byHost, 5, 1)).total).toBe(7);
    });

    // US-B5
    it('reads every page of the backend, however many the servers are, before it filters, sorts and pages', async () => {
        read.servers = many(1203);
        read.servers[1202] = { ...read.servers[1202], country: 'JP' };
        const found = await uuids({ countries: { inclusive: true, values: ['JP'] } }, byHost, 50, 1);
        expect(found).toEqual({ uuids: ['s1202'], total: 1 });
        const pages = read.listCalls.map(c => c.page.number);
        expect(pages.length).toBeGreaterThan(1);
        expect(pages).toEqual(pages.map((_, i) => i + 1));
    });

    // US-B29
    it('lists the servers of the last page of the backend too', async () => {
        read.servers = many(1203);
        const last = await uuids({}, { field: 'host', order: 'desc' }, 50, 1);
        expect(last.uuids[0]).toBe('s1202');
        expect(last.total).toBe(1203);
    });
});

describe('a server, its checks, its identity and the counts', () => {
    // US-B40
    it('gives the server of an id, and null for an id the catalog has none of (US-B42)', async () => {
        read.servers = [server('a'), server('b')];
        expect(unwrap(await catalog.server('b'))?.uuid).toBe('b');
        expect(unwrap(await catalog.server('nobody'))).toBeNull();
    });

    // US-B40
    it('counts the other servers of the identity, the server itself not counted', async () => {
        read.identityCount = 2;
        expect(unwrap(await catalog.othersWithIdentity(server('a', { identity: '64jc' })))).toBe(2);
        expect(read.identityCalls).toEqual([{ identity: '64jc', except: 'a' }]);
    });

    // US-B35
    it('gives the page of the checks of the servers asked for', async () => {
        const at = new Date('2026-11-25T10:00:00Z');
        read.serverChecks = [
            { uuid: 'c1', serverUuid: 'a', status: true, country: 'DE', infoPageAvailable: false, createdAt: at },
            { uuid: 'c2', serverUuid: 'b', status: false, country: 'DE', infoPageAvailable: false, createdAt: at },
        ];
        const page = unwrap(await catalog.checks(['a'], { size: 10, number: 1 }));
        expect(page.items.map(c => c.uuid)).toEqual(['c1']);
        expect(page.total).toBe(1);
    });

    // US-B1
    it('gives the page of the counts per location', async () => {
        read.countryCounts = [{ country: 'DE', active: 3, inactive: 1 }, { country: 'JP', active: 1, inactive: 0 }];
        const page = unwrap(await catalog.countries({ size: 1, number: 2 }));
        expect(page).toEqual({ items: [{ country: 'JP', active: 1, inactive: 0 }], total: 2 });
    });
});

describe('a failure of the backend', () => {
    // US-B5
    it('gives an error, and does not throw, when the servers cannot be read', async () => {
        read.failure = 'network down';
        expect(await catalog.list({}, byHost, { size: 10, number: 1 })).toEqual({ ok: false, error: 'network down' });
    });

    // US-B5
    it('gives an error when a later page of the servers cannot be read, not the servers of the pages that were', async () => {
        read.servers = Array.from({ length: 1203 }, (_, i) => server(`s${i}`));
        read.failOnPage = 2;
        const result = await catalog.list({}, byHost, { size: 10, number: 1 });
        expect(result.ok).toBe(false);
    });

    // US-B40
    it('gives an error from every other call too', async () => {
        read.failure = 'boom';
        const page = { size: 10, number: 1 };
        expect((await catalog.server('a')).ok).toBe(false);
        expect((await catalog.checks(['a'], page)).ok).toBe(false);
        expect((await catalog.othersWithIdentity(server('a'))).ok).toBe(false);
        expect((await catalog.countries(page)).ok).toBe(false);
    });
});
