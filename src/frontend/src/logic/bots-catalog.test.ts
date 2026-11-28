import { beforeEach, describe, expect, it } from 'vitest';
import type { BotsSortField, Sort } from '../ports';
import { BotsCatalog } from './bots-catalog';
import { bot, FakeBotsRead, unwrap } from './fakes';

const sort: Sort<BotsSortField> = { field: 'is_online', order: 'desc' };
const page = { size: 2, number: 1 };

let read: FakeBotsRead;
let catalog: BotsCatalog;

beforeEach(() => {
    read = new FakeBotsRead();
    catalog = new BotsCatalog(read);
});

// US-C11
it('gives the page of the bots the backend lets through, and how many it lets through in all', async () => {
    read.bots = [bot('a'), bot('b'), bot('c')];
    const first = unwrap(await catalog.list({}, sort, page));
    expect(first.items.map(b => b.uuid)).toEqual(['a', 'b']);
    expect(first.total).toBe(3);
    expect(unwrap(await catalog.list({}, sort, { size: 2, number: 2 })).items.map(b => b.uuid)).toEqual(['c']);
});

// US-C6
it('asks the backend for the filter and the sort as they are', async () => {
    const filter = { status: true, text: 'weather', uptime7: 0.9 };
    await catalog.list(filter, { field: 'lastCheck', order: 'asc' }, page);
    expect(read.listCalls).toEqual([{ filter, sort: { field: 'lastCheck', order: 'asc' }, page }]);
});

// US-C8
it('gives a total of 0 when the search or filter finds no bot, even after one that found some', async () => {
    read.bots = Array.from({ length: 14 }, (_, i) => bot(`b${i}`));
    expect(unwrap(await catalog.list({}, sort, page)).total).toBe(14);

    const none = unwrap(await catalog.list({ text: 'nothing like it' }, sort, page));
    expect(none.items).toEqual([]);
    expect(none.total).toBe(0);
});

// US-C12
it('gives the bot of an id, and its details', async () => {
    read.bots = [bot('a'), bot('b')];
    read.botDetails = [{ botUuid: 'b', greetingMessage: 'Hello', commands: [{ keyword: '/help', label: 'Help' }] }];
    expect(unwrap(await catalog.bot('b'))?.uuid).toBe('b');
    expect(unwrap(await catalog.details('b'))?.greetingMessage).toBe('Hello');
});

// US-C15
it('gives null for a bot nobody has added', async () => {
    read.bots = [bot('a')];
    expect(unwrap(await catalog.bot('nobody'))).toBeNull();
    expect(unwrap(await catalog.details('nobody'))).toBeNull();
});

// US-C28
it('gives the page of the checks of the bots asked for', async () => {
    const at = new Date('2026-11-25T10:00:00Z');
    read.botChecks = [
        { uuid: 'c1', botUuid: 'a', status: true, createdAt: at },
        { uuid: 'c2', botUuid: 'b', status: false, createdAt: at },
    ];
    expect(unwrap(await catalog.checks(['b'], page)).items.map(c => c.uuid)).toEqual(['c2']);
});

// US-C1
it('gives an error, and does not throw, whenever the backend fails', async () => {
    read.failure = 'network down';
    expect(await catalog.list({}, sort, page)).toEqual({ ok: false, error: 'network down' });
    expect((await catalog.bot('a')).ok).toBe(false);
    expect((await catalog.details('a')).ok).toBe(false);
    expect((await catalog.checks(['a'], page)).ok).toBe(false);
});
