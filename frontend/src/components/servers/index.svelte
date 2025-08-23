<script lang="ts">
    import type { Readable } from 'svelte/store';
    import type { ServersService, Filter, Sort, SortField, SortOrder } from '../../store/servers-service';
    import type { Server, ServersStore } from '../../store/servers-store';
    import ServerModal from './server-modal/index.svelte';
    import LineUri from './fields/line-uri.svelte';
    import TableHeader from './table-header.svelte';
    import LineStatus from './fields/line-status.svelte';
    import LineDate from './fields/line-date.svelte';
    import Labels from './labels.svelte';
    import LineServerInfo from './fields/line-server-info.svelte';
    import LineUptime from './fields/line-uptime.svelte';
    import LineCountry from './fields/line-country.svelte';
    import { QueryStore, QueryStoreList } from '../../query-store';
    import type { CountriesStore } from '../../store/countries-store';
    import type { ServerStatusesStore } from '../../store/server-statuses-store';
    import type { ServerStatusesService } from '../../store/server-statuses-service';

    interface Props {
        serversStore: ServersStore;
        serversService: ServersService;
        countriesStore: CountriesStore;
        serverStatusesStore: ServerStatusesStore;
        serverStatusesService: ServerStatusesService;
    }

    let { serversStore, serversService, countriesStore, serverStatusesStore, serverStatusesService }: Props = $props();

    let allServers = $derived(serversStore.items);
    let currentServers = $derived(
        $allServers
    );

    let countries = $derived(countriesStore.items);

    let totalCountStore: Readable<number> = $derived(serversStore.totalCount);
    let totalCount: number = $derived($totalCountStore);

    let pageSize: number = $state(10);
    let pageNumber: number = $state(1);
    let pageCount: number = $derived(Math.ceil(totalCount / pageSize));

    let serversPromise: Promise<void> = $state(Promise.resolve());

    const sortField = new QueryStore<SortField>('filter-sort-column', 'lastCheck', ['status', 'lastCheck', 'uptime7', 'uptime30', 'uptime90']);
    const sortOrder = new QueryStore<SortOrder>('filter-sort-direction', 'desc', ['asc', 'desc']);

    let sort: Sort = $derived({
        field: $sortField || 'lastCheck',
        order: $sortOrder || 'desc',
    });
    let filter: Filter = $state({
        uuids: null,
        protocol: 'smp',
        infoPageAvailable: null,
        identity: null,
        host: '',
        countries: null,
        status: true,
        uptime7: null,
        uptime30: null,
        uptime90: null,
    });

    const refresh = function () {
        if (!isFinite(pageSize)) {
            pageSize = 10;
        }
        if (!isFinite(pageNumber)) {
            pageNumber = 1;
        }
        serversPromise = serversService.fetch(filter, sort, pageSize, pageNumber);
    };

    $effect(() => refresh());

    $effect(() => {
        if (filter) {
            pageNumber = 1;
        }
    });

    let serversModal: Server[] = $state([]);

    const changePage = async function (pageCount: number, newPage: number) {
        if (newPage < 1 || newPage > pageCount) {
            return;
        }
        pageNumber = newPage;
    };

    const selectedServersUuid = new QueryStoreList<string>('selected-servers', []);
    let selectedServers = $derived($selectedServersUuid.map(uuid => $allServers.find(server => server.uuid === uuid)));

    const toggleSelectedServer = function (server: Server) {
        if ($selectedServersUuid.includes(server.uuid)) {
            $selectedServersUuid = $selectedServersUuid.filter((uuid: string) => server.uuid !== uuid);
        } else {
            $selectedServersUuid = [...$selectedServersUuid, server.uuid];
        }
    };
</script>

<ServerModal bind:servers={serversModal} {serverStatusesStore} {serverStatusesService} />

<div class="uk-overflow-auto uk-width-1-1">
    <div class="uk-float-left uk-margin-left uk-margin-right uk-width-auto@m uk-width-1-1 uk-text-center">
        {#await serversPromise}
            <span uk-spinner="ratio: 1.2"></span>
        {:then}
            <button class="uk-text-large pointer" onclick={refresh} uk-tooltip="Refresh">
                🔄
            </button>
        {/await}
    </div>
    <div>
        <button class="uk-button uk-button-secondary uk-float-right uk-width-auto@m uk-width-1-1" 
                onclick={() => serversModal = selectedServers}
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
        <select class="uk-select uk-width-1-1 uk-width-auto@m" bind:value={$sortField}>
            <option value="protocol">Sort by: Type</option>
            <option value="status">Sort by: Status</option>
            <option value="last_check">Sort by: Last check</option>
            <option value="info_page_available">Sort by: Info page</option>
            <option value="uptime7">Sort by: Uptime 7d</option>
            <option value="uptime30">Sort by: Uptime 30d</option>
            <option value="uptime90">Sort by: Uptime 90d</option>
        </select>
        <div class="uk-margin-small uk-width-1-1 uk-width-auto@m uk-inline-block"></div>
        <select class="uk-select uk-width-1-1 uk-width-auto@m" bind:value={$sortOrder}>
            <option value="asc">Sort direction: Ascending</option>
            <option value="desc">Sort direction: Descending</option>
        </select>
    </div>
    <table class="table uk-table uk-table-divider uk-table-small">
        <TableHeader
            bind:filter={filter}
            onAllServerSelected={value => $selectedServersUuid = value ? currentServers.map(({ uuid }) => uuid) : []}
            countries={$countries}
        />

        <tbody class="uk-list-striped uk-table-hover">
            {#each currentServers as server (server.uuid)}
                <tr class="uk-text-small" class:uk-text-danger={!server.status}>
                    <td>
                        <input type="checkbox" checked={$selectedServersUuid.includes(server.uuid)} onclick={() => toggleSelectedServer(server)} />
                    </td>
                    <td>
                        <Labels uuid={server.uuid} />
                    </td>
                    <td>
                        <span
                            class="uk-label"
                            class:uk-label-default={server.protocol === 'smp'}
                            class:uk-label-warning={server.protocol === 'xftp'}
                        >
                            {server.protocol.toUpperCase()}
                        </span>
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
