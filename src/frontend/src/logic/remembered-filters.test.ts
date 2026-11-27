import { beforeEach, expect, it } from 'vitest';
import { FakeStorage } from './fakes';
import { RememberedFilters } from './remembered-filters';

let storage: FakeStorage;
let filters: RememberedFilters;

beforeEach(() => {
    storage = new FakeStorage();
    filters = new RememberedFilters(storage);
});

// US-B23
it('gives null for a list never filtered in this browser', () => {
    expect(filters.recall('servers')).toBeNull();
});

// US-B23
it('gives the filters a list was last left with', () => {
    filters.remember('servers', { protocol: 'smp', status: true });
    expect(filters.recall('servers')).toEqual({ protocol: 'smp', status: true });
});

// US-B23
it('gives the filters of the latest remembering, not of the first', () => {
    filters.remember('servers', { status: true });
    filters.remember('servers', { status: false, host: 'example' });
    expect(filters.recall('servers')).toEqual({ status: false, host: 'example' });
});

// US-C10
it('keeps the filters of each list apart', () => {
    filters.remember('servers', { protocol: 'xftp' });
    filters.remember('bots', { status: true, text: 'weather' });
    filters.remember('relays', { name: 'relay' });
    expect(filters.recall('servers')).toEqual({ protocol: 'xftp' });
    expect(filters.recall('bots')).toEqual({ status: true, text: 'weather' });
    expect(filters.recall('relays')).toEqual({ name: 'relay' });
});

// US-D10
it('has them there when the visitor comes back', () => {
    filters.remember('relays', { status: false });
    expect(new RememberedFilters(storage).recall('relays')).toEqual({ status: false });
});

// US-B23
it('gives null for filters that set nothing, which is as though the list was never filtered', () => {
    filters.remember('servers', {});
    expect(filters.recall('servers')).toBeNull();
    filters.remember('servers', { host: undefined, status: undefined });
    expect(filters.recall('servers')).toBeNull();
});

// US-B23
it('gives the filters that set a thing even when it is false or 0', () => {
    filters.remember('servers', { infoPageAvailable: false });
    expect(filters.recall('servers')).toEqual({ infoPageAvailable: false });
    filters.remember('servers', { uptime7: 0 });
    expect(filters.recall('servers')).toEqual({ uptime7: 0 });
});

// US-C10
it('gives null for what the browser kept that is not a set of filters', () => {
    for (const kept of ['text', 42, true, [], [1, 2]]) {
        storage.filters.set('bots', kept);
        expect(filters.recall('bots'), JSON.stringify(kept)).toBeNull();
    }
});

// US-B23
it('gives null, and does not throw, when the browser does not let them be read', () => {
    filters.remember('servers', { status: true });
    storage.loadFailure = 'blocked';
    expect(filters.recall('servers')).toBeNull();
});

// US-B23
it('does not throw when the browser does not keep them', () => {
    storage.saveFailure = 'quota';
    expect(() => filters.remember('servers', { status: true })).not.toThrow();
});
