import { getContext, setContext } from 'svelte';
import type { InboundPorts } from '@/ports';
import { CountriesStore } from './servers/countries-store';
import { LabelsStore } from './servers/labels-store';

/** What the pages reach: the inbound ports, and the stores of what several pages show at once. */
export interface Website {
    ports: InboundPorts;
    labels: LabelsStore;
    countries: CountriesStore;
}

const KEY = Symbol('website');

/** Makes the website of these ports for the root and every page under it; called by the root alone. */
export function provideWebsite(ports: InboundPorts): Website {
    const website: Website = { ports, labels: new LabelsStore(ports.labels), countries: new CountriesStore(ports.servers) };
    setContext(KEY, website);
    return website;
}

/** The website, for a page or a part of one, as the root made it. */
export function useWebsite(): Website {
    return getContext<Website>(KEY);
}
