<script lang="ts">
    import { fetchServers, type FetchParams, type Server } from '../../database';
    import ServerModal from './server-modal/index.svelte';
    import LineUri from './line-uri.svelte';
    import LineStatus from './line-status.svelte';
    import LineDate from './line-date.svelte';
    import { flagStore } from './flagged';
    import Flag from './flag.svelte';
    import LineServerInfo from './line-server-info.svelte';
    import LineUptime from './line-uptime.svelte';
    import LineCountry from './line-country.svelte';
    import { QueryStoreList } from '../../query-store';

    interface Props {
        params: FetchParams;
    }

    let { params }: Props = $props();

    let pageSize: number = $state(10);

    let page: number = $state(1);

    $effect(() => {
        if (params) {
            page = 1;
        }
    });

    let localParams = $derived({
        ...params,
        limit: pageSize,
        offset: pageSize * (page - 1),
    });

    const fetch = async function (params: FetchParams): Promise<{ servers: Server[], count: number, pageCount: number }> {
        if (!isFinite(pageSize) || !isFinite(page)) {
            pageSize = 10;
            page = 1;
        }
        try {
            const data = await fetchServers({
                ...params,
                limit: pageSize,
                offset: pageSize * (page - 1),
            });
            return {
                ...data,
                pageCount: Math.ceil(data.count / pageSize)
            }
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
        page = newPage;
    };

    const selectedServers = new QueryStoreList('selected-servers', []);

    const toggleSelectedServer = function (server: Server) {
        if ($selectedServers.includes(server.uuid)) {
            $selectedServers = $selectedServers.filter((uuid: string) => server.uuid !== uuid);
        } else {
            $selectedServers = [...$selectedServers, server.uuid];
        }
    };

    const toggleAllSelectedServers = function (servers: Server[]) {
        if ($selectedServers.length) {
            $selectedServers = [];
        } else {
            $selectedServers = servers.map(({ uuid }) => uuid);
        }
    };

    const getSelectedServers = function (servers: Server[]) {
        return servers.filter(({ uuid }) => $selectedServers.includes(uuid));
    };
</script>

<ServerModal bind:servers={serversModal} />

<select bind:value={pageSize} class="uk-select uk-width-small@m uk-margin-small-bottom uk-width-1-1@s">
    {#each [5, 10, 20, 50] as size}
        <option value={size}>Page size: { size }</option>
    {/each}
</select>

{#await fetch(localParams)}
    <div class="loader uk-flex uk-flex-center uk-flex-middle uk-flex-direction-column">
        <div uk-spinner="ratio: 3"></div>
    </div>
{:then {servers, count, pageCount }}
    <button class="uk-button uk-button-secondary uk-float-right uk-width-auto@m uk-width-1-1@s" 
            onclick={() => serversModal = getSelectedServers(servers)}
            disabled={$selectedServers.length < 2}
            uk-tooltip={$selectedServers.length < 2 ? "Select 2 or more servers" : ""}
        >
        Bulk mode ({ $selectedServers.length })
    </button>
    <table class="table uk-table uk-table-divider uk-table-hover uk-visible@m uk-margin-remove-top">
        <thead>
            <tr>
                <th>
                    <input class="pointer"
                           type="checkbox"
                           uk-tooltip={$selectedServers.length ? "Unselect all" : "Select all"}
                           checked={$selectedServers.length}
                           onclick={() => toggleAllSelectedServers(servers)}
                    />
                </th>
                <th></th>
                <th>Server</th>
                <th>Country</th>
                <th>Status</th>
                <th>Uptime</th>
                <th>Last Check</th>
                <th>QR Code</th>
            </tr>
        </thead>
        <tbody class="uk-list-striped">
            {#if servers.length > 0}
                {#each servers as server (server.uuid)}
                    <tr class="uk-text-small" class:flagged={$flagStore.has(server.uuid)} class:uk-text-danger={!server.status}>
                        <td>
                            <input type="checkbox" checked={$selectedServers.includes(server.uuid)} onclick={() => toggleSelectedServer(server)} />
                        </td>
                        <td>
                            <Flag value={$flagStore.has(server.uuid)} on:click={() => flagStore.toggle(server.uuid) } />
                        </td>
                        <td>
                            <LineUri server={server} />
                        </td>
                        <td>
                            <LineCountry country={server.country} />
                            <span class="uk-margin-left">
                                <LineServerInfo server={server} icon={true} />
                            </span>
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
            {/if}
        </tbody>
    </table>

    <div class="pointer uk-hidden@m uk-margin-xlarge-top uk-margin-small-left" onclick={() => toggleAllSelectedServers(servers)}>
        <input class="pointer"
               type="checkbox"
               checked={$selectedServers.length}
        />
        {$selectedServers.length ? "Unselect all" : "Select all"}
    </div>
    <ul class="uk-hidden@m uk-list uk-list-divider uk-list-striped">
        {#each servers as server (server.uuid)}
            <li class="uk-padding-small" class:flagged={$flagStore.has(server.uuid)} >
                <div uk-grid class="uk-margin-bottom-remove">
                    <div class="uk-width-expand">
                        <div class="uk-width-1-1">
                            <input type="checkbox" checked={$selectedServers.includes(server.uuid)} onclick={() => toggleSelectedServer(server)} />
                            &nbsp;
                            <Flag value={$flagStore.has(server.uuid)} on:click={() => flagStore.toggle(server.uuid) } />
                            &nbsp;
                            <LineCountry country={server.country} />
                            &nbsp;
                            <LineUri server={server} />
                        </div>
                        <div class="uk-width-1-1">
                            Uptime: <LineUptime server={server} />
                        </div>
                        <div class="uk-width-1-1 uk-margin-remove-top">
                            Last check: <LineDate date={server.lastCheck} />
                        </div>
                        <div class="uk-width-1-1 uk-margin-remove-top">
                            <LineServerInfo server={server} icon={false} />
                        </div>
                    </div>
                    <div class="uk-width-1-3 uk-text-center">
                        <div>
                            Status: 
                            <LineStatus status={server.status} />
                        </div>
                        <button class="uk-block uk-margin-top uk-width-1-1 uk-button uk-button-secondary uk-button-small" onclick={() => serversModal = [server]}>QR & stats</button>
                    </div>
                </div>
            </li>
        {/each}
    </ul>

    <div class="uk-flex uk-flex-middle uk-flex-center uk-margin-top uk-margin-bottom uk-flex-column uk-text-center">
        <div class="uk-margin-left uk-margin-right uk-margin-bottom">
            Total servers matching filters: {count}
        </div>
        {#if count}
            <div>
                {#if page !== 1}
                    <button class="uk-button uk-button-default" onclick={() => changePage(pageCount, page - 1)}>
                        ← Previous page
                    </button>
                {/if}
                {#if page !== pageCount}
                    <button class="uk-button uk-button-default" onclick={() => changePage(pageCount, page + 1)}>
                        Next page →
                    </button>
                {/if}
            </div>
            {#if pageCount > 1}
                <div class="uk-margin-top">
                    Page {page} of {pageCount}
                </div>
            {/if}
        {/if}
    </div>
{:catch e}
    Error:
    <pre>
        {e}
        {console.error(e)}
    </pre>
{/await}

<style lang="scss">
    .loader {
        height: 70vh;
    }

    .flagged {
        opacity: 0.6;
        text-decoration: line-through;
    }

    .flag:checked {
        background-color: #222222 !important;
    }
</style>
