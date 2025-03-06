<script lang="ts">
    import { fetchServers, type Server, type Filter, type Sort, fetchCountries, } from '../../database';
    import ServerModal from './server-modal/index.svelte';
    import LineUri from './line-uri.svelte';
    import LineStatus from './line-status.svelte';
    import LineDate from './line-date.svelte';
    import Labels from './labels.svelte';
    import LineServerInfo from './line-server-info.svelte';
    import LineUptime from './line-uptime.svelte';
    import LineCountry from './line-country.svelte';
    import { QueryStore, QueryStoreList } from '../../query-store';
    import TableHeader from './table-header.svelte';

    let servers = $state<Server[]>([]);

    let pageSize: number = $state(10);
    let pageNumber: number = $state(1);

    let refreshRand: number = $state(0);

    let filter: Filter = $state({
        uuids: null,
        protocol: 'smp',
        infoPageAvailable: null,
        identity: null,
        host: '',
        countries: null,
        status: true,
        infoPage: 'any',
        type: 'any',
        uptime7: null,
        uptime30: null,
        uptime90: null,
    });
    let sort: Sort = $state({ column: 'lastCheck', direction: 'desc' });

    $effect(() => {
        if (filter) {
            pageNumber = 1;
        }
    })

    const fetch = async function (filter: Filter, sort: Sort, pageSize: number, pageNumber: number): Promise<{ servers: Server[], count: number, pageCount: number }> {
        if (!isFinite(pageSize)) {
            pageSize = 10;
        }
        if (!isFinite(pageNumber)) {
            pageNumber = 1;
        }
        try {
            const data = await fetchServers(filter, sort, pageSize, pageNumber);
            servers = data.servers;
            return {
                servers: data.servers,
                count: data.count,
                pageCount: Math.ceil(data.count / pageSize),
            };
        } catch (e) {
            alert('Error :( Open dev console for more details');
            throw e;
        }
    };

    let serversModal: Server[] = $state([]);

    const changePage = async function (pageCount: number, newPage: number) {
        if (newPage < 1 || newPage > pageCount) {
            return;
        }
        pageNumber = newPage;
    };

    const selectedServersUuid = new QueryStoreList('selected-servers', []);

    const toggleSelectedServer = function (server: Server) {
        if ($selectedServersUuid.includes(server.uuid)) {
            $selectedServersUuid = $selectedServersUuid.filter((uuid: string) => server.uuid !== uuid);
        } else {
            $selectedServersUuid = [...$selectedServersUuid, server.uuid];
        }
    };

    const getSelectedServers = function (servers: Server[]) {
        return servers.filter(({ uuid }) => $selectedServersUuid.includes(uuid));
    };

    const sortColumn = new QueryStore('filter-sort-column', 'last_check', ['protocol', 'status', 'last_check', 'uptime7', 'uptime30', 'uptime90', 'info_page_available']);
    const sortDirection = new QueryStore('filter-sort-direction', 'desc', ['asc', 'desc']);

    $effect(() => {
        sort = {
            column: $sortColumn,
            direction: $sortDirection,
        };
    });
</script>

<ServerModal bind:servers={serversModal} />

<span class="uk-text-large pointer uk-float-left uk-margin-left uk-margin-right uk-width-auto@m uk-width-1-1 uk-text-center" onclick={() => ++refreshRand} uk-tooltip="Refresh">
    🔄
</span>
<div class="uk-margin-small uk-width-1-1 uk-width-auto@m uk-inline-block"></div>
<button class="uk-button uk-button-secondary uk-float-right uk-width-auto@m uk-width-1-1" 
        onclick={() => serversModal = getSelectedServers(servers)}
        disabled={$selectedServersUuid.length < 2}
        uk-tooltip={$selectedServersUuid.length < 2 ? "Select 2 or more servers" : ""}
    >
    Bulk mode ({ $selectedServersUuid.length })
</button>
<div class="uk-margin-small uk-width-1-1 uk-width-auto@m uk-inline-block"></div>
<select bind:value={pageSize} class="uk-select uk-float-left uk-width-small@m uk-margin-small-bottom uk-width-1-1@s">
    {#each [5, 10, 20, 50, 100] as size}
        <option value={size}>Page size: { size }</option>
    {/each}
</select>
<div class="uk-margin-small uk-width-1-1 uk-width-auto@m uk-inline-block"></div>
<select class="uk-select uk-width-1-1 uk-width-auto@m" bind:value={$sortColumn}>
    <option value="protocol">Sort by: Type</option>
    <option value="status">Sort by: Status</option>
    <option value="last_check">Sort by: Last check</option>
    <option value="info_page_available">Sort by: Info page</option>
    <option value="uptime7">Sort by: Uptime 7d</option>
    <option value="uptime30">Sort by: Uptime 30d</option>
    <option value="uptime90">Sort by: Uptime 90d</option>
</select>
<div class="uk-margin-small uk-width-1-1 uk-width-auto@m uk-inline-block"></div>
<select class="uk-select uk-width-1-1 uk-width-auto@m" bind:value={$sortDirection}>
    <option value="asc">Sort direction: Ascending</option>
    <option value="desc">Sort direction: Descending</option>
</select>

<div class="uk-overflow-auto uk-width-1-1">
    <table class="table uk-table uk-table-divider uk-table-small">
        {#await fetchCountries()}
            <div class="loader uk-flex uk-flex-center uk-flex-middle uk-flex-direction-column">
                <div uk-spinner="ratio: 3"></div>
            </div>
        {:then countries}
                <TableHeader
                    bind:filter={filter}
                    onAllServerSelected={value => $selectedServersUuid = value ? servers.map(({ uuid }) => uuid) : []}
                    countries={countries}
                />
        {/await}
        {#await refreshRand, fetch(filter, sort, pageSize, pageNumber)}
            <div class="loader uk-flex uk-flex-center uk-flex-middle uk-flex-direction-column">
                <div uk-spinner="ratio: 3"></div>
            </div>
        {:then { servers, count, pageCount }}
            {#if servers.length > 0}
                <tbody class="uk-list-striped uk-table-hover">
                    {#each servers as server (server.uuid)}
                        <tr class="uk-text-small" class:uk-text-danger={!server.status}>
                            <td>
                                <input type="checkbox" checked={$selectedServersUuid.includes(server.uuid)} onclick={() => toggleSelectedServer(server)} />
                            </td>
                            <td>
                                <Labels uuid={server.uuid} />
                            </td>
                            <td>
                                {#if server.protocol === 1}
                                    <span class="uk-label uk-label-default">SMP</span>
                                {:else}
                                    <span class="uk-label uk-label-warning">XFTP</span>
                                {/if}
                            </td>
                            <td>
                                <LineUri server={server} />
                            </td>
                            <td>
                                <LineCountry country={server.country} />
                            </td>
                            <td>
                                <LineServerInfo server={server} icon={true} />
                            </td>
                            <td>
                                <LineStatus status={server.status} />
                            </td>
                            <td>
                                <LineUptime server={server} />
                            </td>
                            <td>
                                <LineDate date={server.lastCheck} />
                            </td>
                            <td>
                                <button class="uk-button uk-button-secondary uk-button-small" onclick={() => serversModal = [server]}>QR & stats</button>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            {/if}
            <tbody>
                <tr>
                    <td colspan="100">
                        <div class="uk-flex uk-flex-middle uk-flex-center uk-margin-top uk-margin-bottom uk-flex-column uk-text-center pages">
                            <div class="uk-margin-left uk-margin-right uk-margin-bottom">
                                Total servers matching filters: {count}
                            </div>
                            {#if count}
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
        {:catch e}
            <!-- Error: -->
            <pre>
                {e}
                {console.error(e)}
            </pre>
        {/await}
    </table>
</div>

<style lang="scss">
    .loader {
        height: 70vh;
    }

    .pages {
        width: 100%;
        max-width: 100vw;;
    }
</style>
