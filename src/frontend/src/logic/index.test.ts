import { expect, it } from 'vitest';
import type { OutboundPorts } from '../ports';
import {
    FakeBotsRead, FakeClipboard, FakeFiles, FakeRelaysRead, FakeServersRead, FakeStorage, FakeSubmission, FakeWorldMap,
    bot, relay, server, unwrap,
} from './fakes';
import { makeInboundPorts } from './index';

function outbound(): OutboundPorts {
    return {
        servers: new FakeServersRead(),
        bots: new FakeBotsRead(),
        relays: new FakeRelaysRead(),
        submission: new FakeSubmission(),
        storage: new FakeStorage(),
        clipboard: new FakeClipboard(),
        files: new FakeFiles(),
        worldMap: new FakeWorldMap(),
        environment: { host: 'simplex-catalog.asriyan.me', now: () => new Date('2026-11-25T10:00:00.000Z') },
    };
}

const page = { size: 10, number: 1 };

// US-B20
it('makes the servers\' table see the labels the visitor sets through the labels port', async () => {
    const ports = outbound();
    (ports.servers as FakeServersRead).servers = [server('a'), server('b')];
    const inbound = makeInboundPorts(ports);
    inbound.labels.toggle('a', 'ignored');
    const result = unwrap(await inbound.servers.list(
        { labels: { inclusive: false, values: ['ignored'] } }, { field: 'host', order: 'asc' }, page));
    expect(result.items.map(s => s.uuid)).toEqual(['b']);
});

// US-B1
it('gives every inbound port, each over the outbound port it needs', async () => {
    const ports = outbound();
    (ports.bots as FakeBotsRead).bots = [bot('a')];
    (ports.relays as FakeRelaysRead).relays = [relay('a')];
    const inbound = makeInboundPorts(ports);

    expect(unwrap(await inbound.bots.list({}, { field: 'is_online', order: 'desc' }, page)).total).toBe(1);
    expect(unwrap(await inbound.relays.list({}, { field: 'is_online', order: 'desc' }, page)).total).toBe(1);
    expect((await inbound.adding.addServer('smp://x@y')).ok).toBe(true);
    expect((await inbound.copying.copy('x')).ok).toBe(true);
    expect((await inbound.world.countries()).ok).toBe(true);
    inbound.filters.remember('bots', { status: true });
    expect(inbound.filters.recall('bots')).toEqual({ status: true });
    inbound.labels.export();
    expect((ports.files as FakeFiles).saved[0].name).toBe('simplex-catalog.asriyan.me_labels_2026-11-25T10:00:00.000Z.json');
});
