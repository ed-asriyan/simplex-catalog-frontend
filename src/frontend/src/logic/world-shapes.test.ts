import { expect, it } from 'vitest';
import { err, FakeWorldMap, ok } from './fakes';
import { WorldShapes } from './world-shapes';

// US-B2
it('gives the shapes of the countries', async () => {
    const worldMap = new FakeWorldMap();
    const topology = { type: 'Topology' as const, objects: { countries: { type: 'GeometryCollection' } }, arcs: [[[0, 0]]] };
    worldMap.topology = ok(topology);
    expect(await new WorldShapes(worldMap).countries()).toEqual({ ok: true, value: topology });
});

// US-B2
it('gives an error, and does not throw, when they cannot be had', async () => {
    const worldMap = new FakeWorldMap();
    worldMap.topology = err('map unavailable');
    expect(await new WorldShapes(worldMap).countries()).toEqual({ ok: false, error: 'map unavailable' });
});
