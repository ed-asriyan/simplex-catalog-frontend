<script lang="ts">
    import type { Readable } from 'svelte/store';
    import { serversService, type Filter, type Sort } from '@/store/servers/servers-service';
    import { type Server, serversStore } from '@/store/servers/servers-store';
    import ServerModal from '../server-modal/index.svelte';
    import TableHeader from './table-header.svelte';
    import TableRow from './table-row.svelte';
    import Icon from '@/components/icon.svelte';
    import { labelsStore } from '@/store/servers/labels-store';
    import { countriesStore } from '@/store/servers/countries-store';
    import { countryCodeToName, delay, exportFile, importFile } from '@/utils';
    import LineCountry from '../fields/line-country.svelte';

    interface Props {
        filter: Filter;
        updateFilter: (filter: Filter) => void;
        updateSort: (sort: Sort) => void;
        updatePagination: (pageNumber: number, pageSize: number) => void;
        sort: Sort;
        pageNumber: number;
        pageSize: number;
        refresh: () => void;
    }

    let { filter, updateFilter, updateSort, updatePagination, sort, pageNumber, pageSize, refresh }: Props = $props();

    let totalCountStore: Readable<number> = $derived(serversStore.totalCount);
    let totalCount: number = $derived($totalCountStore);

    let pageCount: number = $derived(Math.ceil(totalCount / pageSize));

    let currentPageServersUuids: Promise<string[]> = $derived(
        serversService.fetch(filter, sort, pageSize, pageNumber)
    );

    interface IdentityGroup {
        identity: string;
        servers: Server[];
    }

    let identityGroups: Promise<IdentityGroup[]> = $derived(
        currentPageServersUuids.then(async (uuids) => {
            const pageServers = uuids.map(uuid => serversStore.getBy("uuid", uuid).get()).filter(Boolean) as Server[];
            if (pageServers.length === 0) return [];

            const uniqueIdentities = [...new Set(pageServers.map(s => s.identity))];
            const siblingMap = await serversService.fetchSiblingsByIdentities(uniqueIdentities, filter);

            const seen = new Set<string>();
            const groups: IdentityGroup[] = [];

            for (const server of pageServers) {
                if (seen.has(server.identity)) continue;
                seen.add(server.identity);

                const serverUuids = siblingMap.get(server.identity) || [server.uuid];
                const groupServers = serverUuids
                    .map(uuid => serversStore.getBy("uuid", uuid).get())
                    .filter(Boolean) as Server[];

                groups.push({ identity: server.identity, servers: groupServers });
            }

            return groups;
        })
    );

    let serverGroupsModal: Server[][] = $state([]);

    const changePage = async function (pageCount: number, newPage: number) {
        if (newPage < 1 || newPage > pageCount) {
            return;
        }
        updatePagination(newPage, pageSize);
    };

    let selectedIdentities = $state<Set<string>>(new Set());
    let selectedGroupCount = $derived(selectedIdentities.size);

    const toggleGroup = function (servers: Server[]) {
        const identity = servers[0]?.identity;
        if (!identity) return;
        const next = new Set(selectedIdentities);
        if (next.has(identity)) {
            next.delete(identity);
        } else {
            next.add(identity);
        }
        selectedIdentities = next;
    };

    const getSelectedGroups = async (): Promise<Server[][]> => {
        const groups = await identityGroups;
        return groups.filter(g => selectedIdentities.has(g.identity)).map(g => g.servers);
    };

    const exportLabels = function () {
        const labels = Object.entries($labelsStore).reduce((acc, [label, uuids]) => {
            acc[label] = Array.from(uuids);
            return acc;
        }, {} as Record<string, string[]>);
        exportFile(JSON.stringify(labels), `${location.hostname}_labels_${new Date().toISOString()}.json`, 'application/json');
    };

    const importLabels = async function () {
        const data = await importFile('application/json');
        const labels = JSON.parse(data) as Record<string, string[]>;

        const list = Object.entries(labels).map(([label, uuids]) => `Label "${label}": ${uuids.length} servers`).join('\n');
        if (confirm(`The current labels in this browser will be replaced by the import:\n\n${list}\n\nContinue?`)) {
            labelsStore.importFromJson(labels);
        }
    };

    // --- Filter helpers ---
    let hostFilter = $derived(filter.host);
    let protocolFilter = $derived(filter.protocol);
    let statusFilter: 'any' | 'true' | 'false' | 'unknown' = $derived(filter.status === undefined ? 'any' : filter.status === 'unknown' ? 'unknown' : filter.status ? 'true' : 'false');
    let infoPageFilter: 'any' | 'true' | 'false' = $derived(filter.infoPageAvailable === undefined ? 'any' : filter.infoPageAvailable ? 'true' : 'false');

    let countriesFilterInclusive = $derived(!!filter.countries?.inclusive);
    let countriesFilterValues = $derived(filter.countries?.values || []);
    let countries = $derived(countriesStore.allCountries);
    let countriesSorted = $derived(Array.from($countries).filter(x => x).sort((a, b) => {
        if (['TOR', 'YGGDRASIL'].includes(a)) return -1;
        if (['TOR', 'YGGDRASIL'].includes(b)) return 1;
        return countryCodeToName(a).localeCompare(countryCodeToName(b));
    }));

    let labelsFilterInclusive = $derived(!!filter.labels?.inclusive);
    let labelsFilterValues = $derived(filter.labels?.values || []);
</script>

<ServerModal bind:serverGroups={serverGroupsModal} />

<div class="uk-card uk-card-default uk-card-body uk-card-small uk-margin-bottom">
    <div class="uk-grid-small uk-child-width-1-2@s uk-child-width-1-3@m uk-child-width-1-4@l" uk-grid>
        <div>
            <label class="uk-form-label uk-text-small uk-text-muted">URI</label>
            <input class="uk-input uk-form-small" type="text" placeholder="Filter by host" value={hostFilter || ''} onkeyup={delay(e => updateFilter({ ...filter, host: e.target.value || undefined }), 1500)}>
        </div>
        <div>
            <label class="uk-form-label uk-text-small uk-text-muted">Type</label>
            <select value={protocolFilter || ''} onchange={e => updateFilter({ ...filter, protocol: e.target.value || undefined })} class="uk-select uk-form-small">
                <option value="">All</option>
                <option value="smp">SMP</option>
                <option value="xftp">XFTP</option>
            </select>
        </div>
        <div>
            <label class="uk-form-label uk-text-small uk-text-muted">Status</label>
            <select value={statusFilter} onchange={e => {
                const v = e.target.value;
                updateFilter({ ...filter, status: v === 'any' ? undefined : v === 'unknown' ? 'unknown' : v === 'true' });
            }} class="uk-select uk-form-small">
                <option value="any">Any</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
                <option value="unknown">Unknown</option>
            </select>
        </div>
        <div>
            <label class="uk-form-label uk-text-small uk-text-muted">Info page</label>
            <select value={infoPageFilter} onchange={e => {
                const v = e.target.value;
                updateFilter({ ...filter, infoPageAvailable: v === 'any' ? undefined : v === 'true' });
            }} class="uk-select uk-form-small">
                <option value="any">Any</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
            </select>
        </div>
        <div>
            <label class="uk-form-label uk-text-small uk-text-muted">Location</label>
            <div>
                <button class="uk-button uk-button-default uk-button-small uk-width-1-1" type="button">
                    {countriesFilterValues.length > 0 ? `${countriesFilterValues.length} selected` : 'Any'}
                </button>
                <div uk-dropdown class="uk-overflow-auto" style="height: 300px; max-height: 50vh">
                    <a class="uk-link uk-block" onclick={() => updateFilter({ ...filter, countries: { inclusive: !countriesFilterInclusive, values: filter.countries?.values || [] } })}>
                        {countriesFilterInclusive ? 'Inclusive' : 'Exclusive'}
                    </a>
                    {#if countriesFilterValues.length > 0}
                        <a class="uk-link uk-float-right" onclick={() => updateFilter({ ...filter, countries: { inclusive: countriesFilterInclusive, values: [] } })}>Clear</a>
                    {/if}
                    {#each countriesSorted as country}
                        <div class="uk-margin-small">
                            <input type="checkbox" checked={countriesFilterValues.includes(country)} onchange={() => {
                                const values = countriesFilterValues.includes(country)
                                    ? countriesFilterValues.filter(c => c !== country)
                                    : [...countriesFilterValues, country];
                                updateFilter({ ...filter, countries: { inclusive: countriesFilterInclusive, values } });
                            }} />
                            {#if !countriesFilterInclusive} Not {/if}
                            <LineCountry {country} largeFlag={false}/>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
        <div>
            <label class="uk-form-label uk-text-small uk-text-muted">Labels</label>
            <div>
                <button class="uk-button uk-button-default uk-button-small uk-width-1-1" type="button">
                    {labelsFilterValues.length > 0 ? `${labelsFilterValues.length} selected` : 'Any'}
                </button>
                <div uk-dropdown class="uk-overflow-auto" style="height: 300px; max-height: 50vh">
                    <a class="uk-link uk-block" onclick={() => updateFilter({ ...filter, labels: { inclusive: !labelsFilterInclusive, values: filter.labels?.values || [] } })}>
                        {labelsFilterInclusive ? 'Inclusive' : 'Exclusive'}
                    </a>
                    {#if labelsFilterValues.length > 0}
                        <a class="uk-link uk-float-right" onclick={() => updateFilter({ ...filter, labels: { inclusive: labelsFilterInclusive, values: [] } })}>Clear</a>
                    {/if}
                    {#each Object.keys($labelsStore) as label}
                        <div class="uk-margin-small">
                            <input type="checkbox" checked={labelsFilterValues.includes(label)} onchange={() => {
                                const values = labelsFilterValues.includes(label)
                                    ? labelsFilterValues.filter(l => l !== label)
                                    : [...labelsFilterValues, label];
                                updateFilter({ ...filter, labels: { inclusive: labelsFilterInclusive, values } });
                            }} />
                            {#if !labelsFilterInclusive} Not {/if}
                            {label}
                        </div>
                    {/each}
                </div>
            </div>
        </div>
        <div>
            <label class="uk-form-label uk-text-small uk-text-muted">Min uptime 7d (%)</label>
            <input class="uk-input uk-form-small" type="number" min="0" max="100" placeholder="e.g. 90" value={filter.uptime7 === undefined ? '' : filter.uptime7 * 100} onkeyup={delay(e => updateFilter({ ...filter, uptime7: +e.target.value / 100 || undefined }), 1500)}>
        </div>
        <div>
            <label class="uk-form-label uk-text-small uk-text-muted">Min uptime 30d (%)</label>
            <input class="uk-input uk-form-small" type="number" min="0" max="100" placeholder="e.g. 80" value={filter.uptime30 === undefined ? '' : filter.uptime30 * 100} onkeyup={delay(e => updateFilter({ ...filter, uptime30: +e.target.value / 100 || undefined }), 1500)}>
        </div>
        <div>
            <label class="uk-form-label uk-text-small uk-text-muted">Min uptime 90d (%)</label>
            <input class="uk-input uk-form-small" type="number" min="0" max="100" placeholder="e.g. 70" value={filter.uptime90 === undefined ? '' : filter.uptime90 * 100} onkeyup={delay(e => updateFilter({ ...filter, uptime90: +e.target.value / 100 || undefined }), 1500)}>
        </div>
    </div>
</div>

<div class="uk-margin-small-bottom uk-flex uk-flex-between uk-flex-middle uk-flex-wrap">
    <div class="uk-flex uk-flex-middle uk-flex-wrap" style="gap: 8px;">
        {#await identityGroups}
            <span uk-spinner="ratio: 1.2"></span>
        {:then}
            <span class="cursor" onclick={refresh} title="Refresh">
                <Icon icon="🔄" />
            </span>
        {/await}
        <button class="uk-button uk-button-default uk-button-small" onclick={importLabels}>Import labels</button>
        <button class="uk-button uk-button-default uk-button-small" onclick={exportLabels}>Export labels</button>
    </div>
    <div class="uk-flex uk-flex-middle uk-flex-wrap" style="gap: 8px;">
        <select bind:value={pageSize} class="uk-select uk-form-small uk-width-small">
            {#each [5, 10, 20, 50, 100] as size}
                <option value={size}>Page size: { size }</option>
            {/each}
        </select>
        <button class="uk-button uk-button-secondary uk-button-small"
                onclick={async () => serverGroupsModal = await getSelectedGroups()}
                disabled={selectedGroupCount < 2}
                uk-tooltip={selectedGroupCount < 2 ? "Select 2 or more rows" : ""}
            >
            Bulk mode ({ selectedGroupCount })
        </button>
    </div>
</div>
    <div class="uk-overflow-auto uk-width-1-1">
        <table class="uk-table uk-table-small uk-table-divider">
            <TableHeader
                {sort}
                {updateSort}
                onAllServerSelected={async yes => {
                    if (yes) {
                        const groups = await identityGroups;
                        selectedIdentities = new Set(groups.map(g => g.identity));
                    } else {
                        selectedIdentities = new Set();
                    }
                }}
            />

            <tbody class="uk-list-striped uk-table-hover">
                {#await identityGroups}
                    <span uk-spinner="ratio: 1.2"></span>
                {:then groups} 
                    {#each groups as group (group.identity)}
                        <TableRow 
                            servers={group.servers}
                            selected={selectedIdentities.has(group.identity)}
                            onSelect={() => toggleGroup(group.servers)}
                        />
                    {/each}
                {/await}
            </tbody>
            <tbody>
                <tr>
                    <td colspan="100">
                        <div class="uk-flex uk-flex-middle uk-flex-center uk-margin-top uk-margin-bottom uk-flex-column uk-text-center pages">
                            <div class="uk-margin-left uk-margin-right uk-margin-bottom">
                                Total servers matching filters: {totalCount}
                            </div>
                            {#if totalCount}
                                <div>
                                    <div class="uk-margin-bottom">
                                        {#each Array.from({ length: pageCount }, (_, i) => i + 1) as page}
                                            <button class="uk-button uk-button-default uk-button-small uk-margin-small-right" class:uk-button-secondary={page === pageNumber} onclick={() => changePage(pageCount, page)}>
                                                {page}
                                            </button>
                                        {/each}
                                    </div>
                                    {#if pageNumber !== 1}
                                        <button class="uk-button uk-button-default" onclick={() => changePage(pageCount, pageNumber - 1)}>
                                            ← Previous page
                                        </button>
                                    {/if}
                                    {#if pageNumber !== pageCount}
                                        <button class="uk-button uk-button-default" onclick={() => changePage(pageCount, pageNumber + 1)}>
                                            Next page →
                                        </button>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
</div>

<style lang="scss">
    .pages {
        width: 100%;
        max-width: 100vw;;
    }
</style>