<script lang="ts">
    import type { Readable } from 'svelte/store';
    import { serversService, type Filter, type Sort } from '../../../store/servers-service';
    import { type Server, serversStore } from '../../../store/servers-store';
    import ServerModal from '../server-modal/index.svelte';
    import TableHeader from './table-header.svelte';
    import TableRow from './table-row.svelte';
    import Icon from '../../icon.svelte';
    import { labelsStore } from '../../../store/labels-store';
    import { exportFile, importFile } from '../../../utils';

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

    let allServers = $derived(serversStore.items);

    let totalCountStore: Readable<number> = $derived(serversStore.totalCount);
    let totalCount: number = $derived($totalCountStore);

    let pageCount: number = $derived(Math.ceil(totalCount / pageSize));

    let currentPageServersUuids: Promise<string[]> = $derived(
        serversService.fetch(filter, sort, pageSize, pageNumber)
    );
    let currentPageServers: Promise<Server[]> = $derived(
        currentPageServersUuids
            .then(
                uuids => uuids.map(uuid => serversStore.getBy("uuid", uuid).get()).filter(x => !!x)
            )
    );

    let serversModal: Server[] = $state([]);

    const changePage = async function (pageCount: number, newPage: number) {
        if (newPage < 1 || newPage > pageCount) {
            return;
        }
        updatePagination(newPage, pageSize);
    };

    let selectedServersUuid = $state<string[]>([]);
    let selectedServers = $derived(selectedServersUuid.map(uuid => $allServers.find(server => server.uuid === uuid)));

    const toggleSelectedServer = function (server: Server) {
        if (selectedServersUuid.includes(server.uuid)) {
            selectedServersUuid = selectedServersUuid.filter((uuid: string) => server.uuid !== uuid);
        } else {
            selectedServersUuid = [...selectedServersUuid, server.uuid];
        }
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
</script>

<ServerModal bind:servers={serversModal} />

<div class="uk-margin-small-bottom">
    <button class="uk-button uk-button-default uk-margin-small-right uk-width-auto@m uk-width-1-1" onclick={importLabels}>
        Import labels
    </button>
    <button class="uk-button uk-button-default uk-width-auto@m uk-width-1-1" onclick={exportLabels}>
        Export labels
    </button>
</div>
<div class="uk-width-1-1">
    <div class="uk-float-left uk-margin-left uk-margin-right uk-width-auto@m uk-width-1-1 uk-text-center">
        {#await currentPageServers}
            <span uk-spinner="ratio: 1.2"></span>
        {:then}
            <button class="uk-text-large pointer" onclick={refresh} uk-tooltip="Refresh">
                <Icon icon="🔄" />
            </button>
        {/await}
    </div>
    <div>
        <button class="uk-button uk-button-secondary uk-float-right uk-width-auto@m uk-width-1-1" 
                onclick={() => serversModal = selectedServers}
                disabled={selectedServersUuid.length < 2}
                uk-tooltip={selectedServersUuid.length < 2 ? "Select 2 or more servers" : ""}
            >
            Bulk mode ({ selectedServersUuid.length })
        </button>
        <div class="uk-margin-small uk-width-1-1 uk-width-auto@m uk-inline-block"></div>
        <select bind:value={pageSize} class="uk-select uk-float-left uk-width-small@m uk-margin-small-bottom uk-width-1-1@s">
            {#each [5, 10, 20, 50, 100] as size}
                <option value={size}>Page size: { size }</option>
            {/each}
        </select>
        <div class="uk-margin-small uk-width-1-1 uk-width-auto@m uk-inline-block"></div>
        <select class="uk-select uk-width-1-1 uk-width-auto@m" value={sort.field} onchange={e => updateSort({ ...sort, field: e.target.value })}>
            <option value="protocol">Sort by: Type</option>
            <option value="status">Sort by: Status</option>
            <option value="last_check">Sort by: Last check</option>
            <option value="info_page_available">Sort by: Info page</option>
            <option value="uptime7">Sort by: Uptime 7d</option>
            <option value="uptime30">Sort by: Uptime 30d</option>
            <option value="uptime90">Sort by: Uptime 90d</option>
        </select>
        <div class="uk-margin-small uk-width-1-1 uk-width-auto@m uk-inline-block"></div>
        <select class="uk-select uk-width-1-1 uk-width-auto@m" value={sort.order} onchange={e => updateSort({ ...sort, order: e.target.value })}>
            <option value="asc">Sort direction: Ascending</option>
            <option value="desc">Sort direction: Descending</option>
        </select>
    </div>
</div>
    <div class="uk-overflow-auto uk-width-1-1">
        <table class="uk-table uk-table-small uk-table-divider">
            <TableHeader
                {updateFilter}
                {filter}
                onAllServerSelected={async yes => { console.log(yes); selectedServersUuid = yes ? await currentPageServersUuids : []}}
            />

            <tbody class="uk-list-striped uk-table-hover">
                {#await currentPageServers}
                    <span uk-spinner="ratio: 1.2"></span>
                {:then currentPageServers} 
                    {#each currentPageServers as server (server.uuid)}
                        <TableRow 
                            {server}
                            selected={selectedServersUuid.includes(server.uuid)}
                            onSelect={() => toggleSelectedServer(server)}
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