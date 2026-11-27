import type { InboundPorts, OutboundPorts } from '../ports';
import { Adding } from './adding';
import { BotsCatalog } from './bots-catalog';
import { Copying } from './copying';
import { RelaysCatalog } from './relays-catalog';
import { RememberedFilters } from './remembered-filters';
import { ServerLabels } from './server-labels';
import { ServersCatalog } from './servers-catalog';
import { WorldShapes } from './world-shapes';

/** The website's logic over the outbound ports the adapters implement; `main.ts` hands what it gives to the pages. */
export function makeInboundPorts(outbound: OutboundPorts): InboundPorts {
    const labels = new ServerLabels(outbound.storage, outbound.files, outbound.environment);
    return {
        servers: new ServersCatalog(outbound.servers, labels),
        bots: new BotsCatalog(outbound.bots),
        relays: new RelaysCatalog(outbound.relays),
        adding: new Adding(outbound.submission),
        labels,
        filters: new RememberedFilters(outbound.storage),
        copying: new Copying(outbound.clipboard),
        world: new WorldShapes(outbound.worldMap),
    };
}
