<script lang="ts">
    import { fetchServers, type FetchParams, type Server } from '../../database';
    import QrCodeModal from './qr-code-modal.svelte';
    import LineUri from './line-uri.svelte';
    import LineStatus from './line-status.svelte';
    import LineDate from './line-date.svelte';
    import { flagStore } from './flagged';
    import Flag from './flag.svelte';

    export let params: FetchParams;

    let pageSize: number = 10;

    let page: number = 1;

    $: if (params) {
        page = 1;
    }

    $: localParams = {
        ...params,
        limit: pageSize,
        offset: pageSize * (page - 1),
    };

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

    let qrCodeText: string = '';

    const changePage = async function (pageCount: number, newPage: number) {
        if (newPage < 1 || newPage > pageCount) {
            return;
        }
        page = newPage;
    };
</script>

<QrCodeModal bind:uri={qrCodeText} />

{#await fetch(localParams)}
    <div class="loader uk-flex uk-flex-center uk-flex-middle uk-flex-direction-column">
        <div uk-spinner="ratio: 3"></div>
    </div>
{:then { servers, count, pageCount }}
    <table class="table uk-table uk-table-divider uk-table-hover uk-visible@m">
        <thead>
            <tr>
                <th></th>
                <th>URI</th>
                <th>QR Code</th>
                <th>Status</th>
                <th>Status Since</th>
                <th>Last Check</th>
            </tr>
        </thead>
        <tbody>
            {#if servers.length > 0}
                {#each servers as server (server.uuid)}
                    <tr class="uk-text-small" class:flagged={$flagStore.has(server.uri)} class:uk-text-danger={!server.status}>
                        <td>
                            <Flag value={$flagStore.has(server.uri)} on:click={() => flagStore.toggle(server.uri) } />
                        </td>
                        <td>
                            <LineUri uri={server.uri} />
                        </td>
                        <td>
                            <button class="uk-button uk-button-secondary uk-button-small" on:click={() => qrCodeText = server.uri}>QR</button>
                        </td>
                        <td>
                            <LineStatus status={server.status} />
                        </td>
                        <td>
                            <LineDate date={server.statusSince} />
                        </td>
                        <td>
                            <LineDate date={server.lastCheck} />
                        </td>
                    </tr>
                {/each}
            {/if}
        </tbody>
    </table>

    <ul class="uk-hidden@m uk-list uk-list-divider uk-list-striped">
        {#each servers as server (server.uuid)}
            <li class="uk-padding-small" class:flagged={$flagStore.has(server.uri)} >
                <div uk-grid class="uk-margin-bottom-remove">
                    <div class="uk-width-expand">
                        <div class="uk-width-1-1">
                            <Flag value={$flagStore.has(server.uri)} on:click={() => flagStore.toggle(server.uri) } />
                            &nbsp;
                            <LineUri uri={server.uri} />
                        </div>
                        <div class="uk-width-1-1">
                            Status since: <LineDate date={server.statusSince} />
                        </div>
                        <div class="uk-width-1-1 uk-margin-remove-top">
                            Last check: <LineDate date={server.lastCheck} />
                        </div>
                    </div>
                    <div class="uk-width-1-3 uk-text-center">
                        <div>
                            Status: 
                            <LineStatus status={server.status} />
                        </div>
                        <button class="uk-block uk-margin-top uk-width-1-1 uk-button uk-button-secondary uk-button-small" on:click={() => qrCodeText = server.uri}>QR Code</button>
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
                    <button class="uk-button uk-button-default" on:click={() => changePage(pageCount, page - 1)}>
                        ← Previous page
                    </button>
                {/if}
                {#if page !== pageCount}
                    <button class="uk-button uk-button-default" on:click={() => changePage(pageCount, page + 1)}>
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
    </pre>
{/await}

<style lang="scss">
    .loader {
        height: 70vh;
    }

    .flagged {
        opacity: 0.7;
        background-color: rgba(0, 0, 0, 0.05);
    }

    .flag:checked {
        background-color: #222222 !important;
    }
</style>
