import { beforeEach, expect, it } from 'vitest';
import type { RelaysSortField, Sort } from '../ports';
import { FakeRelaysRead, relay, unwrap } from './fakes';
import { RelaysCatalog } from './relays-catalog';

const sort: Sort<RelaysSortField> = { field: 'is_online', order: 'desc' };
const page = { size: 2, number: 1 };

let read: FakeRelaysRead;
let catalog: RelaysCatalog;

beforeEach(() => {
    read = new FakeRelaysRead();
    catalog = new RelaysCatalog(read);
});

// US-D1
it('gives the page of the relays the backend lets through, and how many it lets through in all', async () => {
    read.relays = [relay('a'), relay('b'), relay('c')];
    const result = unwrap(await catalog.list({}, sort, page));
    expect(result.items.map(r => r.uuid)).toEqual(['a', 'b']);
    expect(result.total).toBe(3);
});

// US-D6
it('asks the backend for the filter and the sort as they are', async () => {
    const filter = { status: true, name: 'relay', url: 'example', uptime30: 0.8 };
    await catalog.list(filter, { field: 'name', order: 'asc' }, page);
    expect(read.listCalls).toEqual([{ filter, sort: { field: 'name', order: 'asc' }, page }]);
});

// US-D6
it('gives the total of a list that finds none as 0, as the backend does', async () => {
    read.relays = [relay('a')];
    await catalog.list({}, sort, page);
    expect(unwrap(await catalog.list({ status: false }, sort, page))).toEqual({ items: [], total: 0 });
});

// US-D16
it('gives the relay of an id, and null for one the catalog lists none of', async () => {
    read.relays = [relay('a'), relay('b')];
    expect(unwrap(await catalog.relay('b'))?.uuid).toBe('b');
    expect(unwrap(await catalog.relay('nobody'))).toBeNull();
});

// US-D24
it('gives the page of the checks of the relays asked for', async () => {
    const at = new Date('2026-11-25T10:00:00Z');
    read.relayChecks = [
        { uuid: 'c1', relayUuid: 'a', status: true, createdAt: at },
        { uuid: 'c2', relayUuid: 'b', status: true, createdAt: at },
    ];
    expect(unwrap(await catalog.checks(['a'], page)).items.map(c => c.uuid)).toEqual(['c1']);
});

// US-D1
it('gives an error, and does not throw, whenever the backend fails', async () => {
    read.failure = 'network down';
    expect(await catalog.list({}, sort, page)).toEqual({ ok: false, error: 'network down' });
    expect((await catalog.relay('a')).ok).toBe(false);
    expect((await catalog.checks(['a'], page)).ok).toBe(false);
});
