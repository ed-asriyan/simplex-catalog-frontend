<script lang="ts">
    import moment from 'moment';
    import QrCodeModal from './qr-code-modal.svelte';
    import { addServer, type Column, doesServerExist, fetchServers, type Server } from './database';
    import { fade } from 'svelte/transition';

    let pageSize: number;

    let servers: Server[] = [];
    let statusFilter: string = "true";
    let page: number = 1;
    let count: number = 1;
    let sortColumn: Column = null;
    let sortDirection: 'asc' | 'desc' = 'asc';

    $: pageCount = Math.ceil(count / pageSize);

    let isLoading = false;

    const fetch = async function () {
        if (!isFinite(pageSize) || !isFinite(page)) {
            return;
        }
        try {
            isLoading = true;
            const data = await fetchServers({
                limit: pageSize,
                offset: pageSize * (page - 1),
                sort: sortColumn && sortDirection ? { column: sortColumn, direction: sortDirection } : undefined,
                filter: statusFilter !== "null" ? { column: 'status', value: statusFilter } : undefined,
            });
            servers = data.servers;
            count = data.count;
        } catch (e) {
            alert('Error :( Open dev console for more details');
            throw e;
        } finally {
            isLoading = false;
        }
    }

    $: (async function (...args) {
        page = 1;
        await fetch();
    })(statusFilter, pageSize, sortColumn, sortDirection);

    const changePage = async function (newPage: number) {
        if (newPage < 1 || newPage > pageCount) {
            return;
        }
        page = newPage;
        await fetch();
    };

    const changeSort = async function (column: Column) {
        if (sortColumn === column) {
            switch (sortDirection) {
                case 'asc':
                    sortDirection = 'desc';
                    break;
                case 'desc':
                    sortDirection = null
                    break;
                default:
                sortDirection = 'asc';
            }
        } else {
            sortColumn = column;
            sortDirection = 'asc';
        }
    };

    let copyTumbler: string = null;
    let timeout;
    const copyToClipboard = function (str: string) {
        const input = document.createElement('input');
        input.setAttribute('value', str);
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        copyTumbler = str;
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => copyTumbler = null, 4000);
    };

    const maskUri = function (uri: string): string {
        if (uri.endsWith('.onion')) {
            if (uri.includes(',')){
                return uri.replace(/smp:\/\/(.+)@(.+)\,(.+)\.onion$/, "smp://<...>@$2,<...>.onion")
            } else {
                return uri.replace(/smp:\/\/(.+)@(.+)\.onion$/, "smp://<...>@<...>.onion");
            }
        } else {
            return uri.replace(/smp:\/\/(.+)@(.+)/, "smp://<...>@$2")
        }
    };

    let qrCodeText: string = null

    const addServerClick = async function () {
        const input = prompt('Enter SMP or XFTP server URI:');
        if (!input) return;

        try {
            if (await doesServerExist(input)) {
                alert('Server already added to the registry');
                return;
            }
            await addServer(input.trim());
            alert('The server is added to the database. If server is available, it will apper in the table in a few minutes');
        } catch (e) {
            if (e.code === '42501') {
                alert('Invalid URI. Please verufy that you entered it correctly.')
            }
            throw e;
        }
    };
</script>

<QrCodeModal bind:text={qrCodeText} />

<div class="uk-flex uk-flex-middle">
    <button class="uk-button uk-button-default" on:click={addServerClick}>Add server</button>
    <div class="uk-flex-1"></div>
    <div>
        Servers per page:
        <select bind:value={pageSize} class="uk-margin-left uk-select uk-form-width-small">
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
        </select>
    </div>
</div>
{#if isLoading}
    <div class="loader uk-flex uk-flex-center uk-flex-middle uk-flex-direction-column">
        <div uk-spinner="ratio: 3"></div>
    </div>
{:else}
    <div class="scrollwrapper">
        <table class="table uk-table uk-table-divider uk-table-hover" transition:fade>
            <thead>
                <tr>
                    <th>
                        <button class="uk-button uk-button-link uk-icon" on:click={() => changeSort('uri')}>
                            URI
                            {#if sortColumn === 'uri' && sortDirection === 'asc'}&#9650;{/if}
                            {#if sortColumn === 'uri' && sortDirection === 'desc'}&#9660;{/if}
                        </button>
                    </th>
                    <th>
                        QR Code
                    </th>
                    <th>
                        Status
                        <div>
                            <select bind:value={statusFilter} class="uk-select uk-form-small" style="width: auto; display: inline-block; margin-left: 8px;">
                                <option value="null">All</option>
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                            </select>
                        </div>
                    </th>
                    <th>
                        <button class="uk-button uk-button-link uk-icon" on:click={() => changeSort('statusSince')} uk-tooltip="Click to sort">
                            Status Since
                            {#if sortColumn === 'statusSince' && sortDirection === 'asc'}&#9650;{/if}
                            {#if sortColumn === 'statusSince' && sortDirection === 'desc'}&#9660;{/if}
                        </button>
                    </th>
                    <th>
                        <button class="uk-button uk-button-link uk-icon" on:click={() => changeSort('lastCheck')} uk-tooltip="Click to sort">
                            Last Availability Check
                            {#if sortColumn === 'lastCheck' && sortDirection === 'asc'}&#9650;{/if}
                            {#if sortColumn === 'lastCheck' && sortDirection === 'desc'}&#9660;{/if}
                        </button>
                    </th>
                </tr>
            </thead>
            <tbody>
                {#if servers.length > 0}
                    {#each servers as server}
                        <tr class="uk-text-smal" class:uk-text-danger={!server.status}>
                            <td class="pointer uk-text-break" uk-tooltip="Click to copy full URI" on:click={copyToClipboard(server.uri)}>
                                {#if copyTumbler === server.uri}
                                    Copied to clipboard
                                {:else}
                                    {maskUri(server.uri)}
                                {/if}
                            </td>
                            <td>
                                <button class="uk-button uk-button-default uk-button-small" on:click={() => qrCodeText = server.uri}>QR</button>
                            </td>
                            <td>{server.status === true ? 'Active' : server.status === false ? 'Inactive' : 'Unknown'}</td>
                            <td uk-tooltip={server.statusSince ? moment(server.statusSince).format('YYYY-MM-DD hh-mm-ss UTC') : ""}>
                                {#if server.statusSince}
                                    {moment(server.statusSince).fromNow()}
                                {:else}
                                    N/A
                                {/if}
                            </td>
                            <td uk-tooltip={server.lastCheck ? moment(server.lastCheck).format('YYYY-MM-DD hh-mm-ss UTC') : ""}>
                                {#if server.lastCheck}
                                    {moment(server.lastCheck).fromNow()}
                                {:else}
                                    N/A
                                {/if}
                            </td>
                        </tr>
                    {/each}
                {:else}
                    <tr>
                        <td colspan="5" class="uk-text-center">No Data Available</td>
                    </tr>
                {/if}
            </tbody>
        </table>
    </div>

    <div class="uk-flex uk-flex-middle uk-flex-center uk-margin-top uk-margin-bottom uk-flex-column uk-text-center">
        <div class="uk-margin-left uk-margin-right uk-margin-bottom">
            Total servers matching filters: {count}
            {#if pageCount > 1}
                <br/>
                Page {page} of {pageCount}
            {/if}
        </div>
        <div>
            {#if page !== 1}
                <button class="uk-button uk-button-default" on:click={() => changePage(page - 1)}>
                    Previous page
                </button>
            {/if}
            {#if page !== pageCount}
                <button class="uk-button uk-button-default" on:click={() => changePage(page + 1)}>
                    Next page
                </button>
            {/if}
        </div>
    </div>
{/if}

<style lang="scss">
    .loader {
        height: 50vh;
    }

    .scrollwrapper {
        overflow: auto;
    }

    .table {
        width: 100%;
        min-width: 50rem;
    }
</style>