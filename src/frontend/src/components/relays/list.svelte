<script lang="ts">
    import { onMount } from "svelte";
    import moment from "moment";
    import type { PageOf, Relay, RelaysFilter as Filter, RelaysSortField, Sort as SortOf } from '@/ports';
    import { useWebsite } from '@/store/website';
    import { valueOf } from '@/store/result';
    import { convertUTCDateToLocalDate, delay, setQueryParam } from '@/utils';
    import Icon from '@/components/icon.svelte';
    import { goto } from "@mateothegreat/svelte5-router";
    import CopyLink from '@/components/copy-link.svelte';
    import Uptime from '@/components/uptime.svelte';
    import StatusBadge from "@/components/status-badge.svelte";

    interface Props {
        route: any,
    }

    type Sort = SortOf<RelaysSortField>;

    let { route }: Props = $props();
    const { ports } = useWebsite();

    let params = $derived(route.result.querystring.params);

    const generateFilter = function (params: any): Filter {
        return {
            status: params?.filterStatus === 'true' ? true : params?.filterStatus === 'false' ? false : params?.filterStatus === 'any' ? undefined : undefined,
            url: params?.filterUrl || undefined,
            name: params?.filterName || undefined,
            uptime7: +params?.filterUptime7 / 100 || undefined,
            uptime30: +params?.filterUptime30 / 100 || undefined,
            uptime90: +params?.filterUptime90 / 100 || undefined,
        };
    };

    const defaultFilter: Filter = { status: true };

    onMount(() => {
        const generatedFilter = generateFilter(params);
        if (Object.values(generatedFilter || {}).filter(x => x !== undefined).length === 0) {
            const stored = ports.filters.recall('relays') as Filter | null;
            setFilter(stored ?? defaultFilter);
        }
    });

    let filter: Filter = $derived({
        ...defaultFilter,
        ...generateFilter(params),
    });

    const setFilter = function (newFilter: Filter) {
        ports.filters.remember('relays', newFilter);
        setQueryParam(route, {
            filterStatus: newFilter.status === undefined ? 'any' : newFilter.status ? 'true' : 'false',
            filterUrl: newFilter.url || '',
            filterName: newFilter.name || '',
            filterUptime7: newFilter.uptime7 === undefined ? '' : String(newFilter.uptime7 * 100),
            filterUptime30: newFilter.uptime30 === undefined ? '' : String(newFilter.uptime30 * 100),
            filterUptime90: newFilter.uptime90 === undefined ? '' : String(newFilter.uptime90 * 100),
        });
    };

    let sort: Sort = $derived({
        field: (params?.sortField || 'last_check') as Sort['field'],
        order: (params?.sortOrder || 'desc') as Sort['order'],
    });

    const updateSort = (field: Sort['field']) => {
        const newOrder = sort.field === field && sort.order === 'desc' ? 'asc' : 'desc';
        setQueryParam(route, {
            sortField: field,
            sortOrder: newOrder,
        });
    };

    const sortIndicator = (field: Sort['field']) => {
        if (sort.field !== field) return '';
        return sort.order === 'asc' ? ' ▲' : ' ▼';
    };

    let pageNumber: number = $derived(+params?.pageNumber || 1);
    let pageSize: number = $derived(+params?.pageSize || 50);

    // The total of the list last read, kept while the next one is read.
    let totalCount: number = $state(0);
    let pageCount: number = $derived(Math.ceil(totalCount / pageSize));

    let currentPage: Promise<PageOf<Relay>> = $derived(
        ports.relays.list(filter, sort, { size: pageSize, number: pageNumber }).then(result => {
            const page = valueOf(result);
            totalCount = page.total;
            return page;
        })
    );
    let currentPageRelays: Promise<Relay[]> = $derived(
        currentPage.then(page => page.items)
    );

    const refresh = function () {
        filter = { ...filter };
    };

    const changePage = function (newPage: number) {
        if (newPage < 1 || newPage > pageCount) return;
        setQueryParam(route, {
            pageNumber: String(newPage),
            pageSize: String(pageSize),
        });
    };

    const addRelayClick = async function () {
        const input = prompt('Enter relay URI:')?.trim();
        if (!input) return;

        const added = await ports.adding.addRelay(input.trim());
        if (added.ok) {
            alert('The relay is added to the database. If the relay is available, it will soon appear in the table for everyone.');
        } else {
            alert(added.error);
        }
    };
</script>

<div class="uk-section uk-section-secondary uk-section-small">
    <div class="uk-container uk-text-center">
        <h2 class="uk-heading-medium">📡 Relays</h2>
        <div>
            Discover and share community-run SimpleX relays.
            <br/>
            Here anyone can anonymously add relays to the public list. The availability of each relay is checked periodically.
        </div>
        <div class="uk-margin-top uk-margin-bottom">
            <button class="uk-button uk-button-default" onclick={addRelayClick}>Add relay anonymously</button>
        </div>
        <div class="uk-text-small">
            <a href="/#/faq" class="uk-link-muted">How to deploy your own relay?</a>
        </div>
    </div>
</div>

<hr class="uk-margin-remove"/>

<div class="uk-section uk-section-muted uk-section-small">
    <div class="uk-container uk-container-expand">
        <div class="uk-card uk-card-default uk-card-body uk-card-small">
            <div class="uk-grid-small uk-child-width-1-2@s uk-child-width-1-3@m uk-child-width-1-6@l" uk-grid>
                <div>
                    <label class="uk-form-label uk-text-small uk-text-muted">URI</label>
                    <input class="uk-input uk-form-small" type="text" placeholder="Filter by URI" value={filter.url || ''} onkeyup={delay(e => setFilter({ ...filter, url: e.target.value || undefined }), 1500)}>
                </div>
                <div>
                    <label class="uk-form-label uk-text-small uk-text-muted">Name</label>
                    <input class="uk-input uk-form-small" type="text" placeholder="Filter by name" value={filter.name || ''} onkeyup={delay(e => setFilter({ ...filter, name: e.target.value || undefined }), 1500)}>
                </div>
                <div>
                    <label class="uk-form-label uk-text-small uk-text-muted">Status</label>
                    <select class="uk-select uk-form-small" value={filter.status?.toString() || ''} onchange={e => setFilter({ ...filter, status: e.target.value === '' ? undefined : e.target.value === 'true' })}>
                        <option value="">Any</option>
                        <option value="true">Online</option>
                        <option value="false">Offline</option>
                    </select>
                </div>
                <div>
                    <label class="uk-form-label uk-text-small uk-text-muted">Min uptime 7d (%)</label>
                    <input class="uk-input uk-form-small" type="number" min="0" max="100" placeholder="e.g. 90" value={filter.uptime7 === undefined ? '' : filter.uptime7 * 100} onkeyup={delay(e => setFilter({ ...filter, uptime7: +e.target.value / 100 || undefined }), 1500)}>
                </div>
                <div>
                    <label class="uk-form-label uk-text-small uk-text-muted">Min uptime 30d (%)</label>
                    <input class="uk-input uk-form-small" type="number" min="0" max="100" placeholder="e.g. 80" value={filter.uptime30 === undefined ? '' : filter.uptime30 * 100} onkeyup={delay(e => setFilter({ ...filter, uptime30: +e.target.value / 100 || undefined }), 1500)}>
                </div>
                <div>
                    <label class="uk-form-label uk-text-small uk-text-muted">Min uptime 90d (%)</label>
                    <input class="uk-input uk-form-small" type="number" min="0" max="100" placeholder="e.g. 70" value={filter.uptime90 === undefined ? '' : filter.uptime90 * 100} onkeyup={delay(e => setFilter({ ...filter, uptime90: +e.target.value / 100 || undefined }), 1500)}>
                </div>
            </div>
        </div>
    </div>
</div>
<div class="uk-section uk-section-muted uk-section-small uk-padding-remove-top">
    <div class="uk-container uk-container-expand">
        {#await currentPageRelays}
            <div class="uk-text-center">
                <span uk-spinner="ratio: 1.2"></span>
            </div>
        {:then relays}
            <div class="uk-margin-small-bottom uk-flex uk-flex-between uk-flex-middle uk-flex-wrap" style="gap: 8px;">
                <div class="uk-flex uk-flex-middle" style="gap: 8px;">
                    {#await currentPage}
                        <span uk-spinner="ratio: 1.2"></span>
                    {:then _}
                        <span class="cursor" onclick={refresh} title="Refresh">
                            <Icon icon="🔄" />
                        </span>
                    {/await}
                </div>
                <select class="uk-select uk-form-small uk-width-small" value={pageSize} onchange={e => setQueryParam(route, { pageSize: e.target.value, pageNumber: '1' })}>
                    {#each [10, 20, 50, 100] as size}
                        <option value={size}>Page size: {size}</option>
                    {/each}
                </select>
            </div>
            <div class="uk-overflow-auto uk-width-1-1">
                <table class="uk-table uk-table-small uk-table-divider uk-table-hover uk-table-middle">
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th class="cursor" onclick={() => updateSort('url')}>URI{sortIndicator('url')}</th>
                            <th class="cursor" onclick={() => updateSort('name')}>Name{sortIndicator('name')}</th>
                            <th class="cursor" onclick={() => updateSort('is_online')}>Status{sortIndicator('is_online')}</th>
                            <th>
                                <span class="cursor" onclick={() => updateSort('uptime7')}>7d{sortIndicator('uptime7')}</span>
                                /
                                <span class="cursor" onclick={() => updateSort('uptime30')}>30d{sortIndicator('uptime30')}</span>
                                /
                                <span class="cursor" onclick={() => updateSort('uptime90')}>90d{sortIndicator('uptime90')}</span>
                            </th>
                            <th class="cursor" onclick={() => updateSort('last_check')}>Last Check{sortIndicator('last_check')}</th>
                            <th class="cursor" onclick={() => updateSort('created_at')}>Added{sortIndicator('created_at')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each relays as relay (relay.uuid)}
                            <tr class="uk-text-small cursor" class:uk-text-danger={relay.status === false} onclick={() => goto(`/#/relays/${relay.uuid}`)}>
                                <td>
                                    {#if relay.photo}
                                        <img class="uk-border-circle" width="32" height="32" src={relay.photo} alt="Avatar">
                                    {:else}
                                        <div class="uk-border-circle uk-background-muted uk-flex uk-flex-center uk-flex-middle" style="width: 32px; height: 32px; font-size: 20px;">
                                            📡
                                        </div>
                                    {/if}
                                </td>
                                <td onclick={(e) => e.stopPropagation()}>
                                    <CopyLink url={relay.url} truncateDirection="end" />
                                </td>
                                <td>
                                    {relay.name || '—'}
                                </td>
                                <td>
                                    <StatusBadge status={relay.status} />
                                </td>
                                <td>
                                    <Uptime relay={relay} style="inline" />
                                </td>
                                <td>
                                    {#if relay.lastCheck}
                                        <span uk-tooltip={convertUTCDateToLocalDate(relay.lastCheck).toLocaleString()}>
                                            {moment(convertUTCDateToLocalDate(relay.lastCheck)).fromNow()}
                                        </span>
                                    {/if}
                                </td>
                                <td>
                                    <span uk-tooltip={convertUTCDateToLocalDate(relay.createdAt).toLocaleString()}>
                                        {moment(convertUTCDateToLocalDate(relay.createdAt)).fromNow()}
                                    </span>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
            <div class="uk-flex uk-flex-middle uk-flex-center uk-margin-top uk-margin-bottom uk-flex-column uk-text-center">
                <div class="uk-margin-bottom">
                    Total relays matching filters: {totalCount}
                </div>
                {#if totalCount > 0 && pageCount > 1}
                    <div>
                        <div class="uk-margin-bottom">
                            {#each Array.from({ length: pageCount }, (_, i) => i + 1) as page}
                                <button class="uk-button uk-button-default uk-button-small uk-margin-small-right" class:uk-button-secondary={page === pageNumber} onclick={() => changePage(page)}>
                                    {page}
                                </button>
                            {/each}
                        </div>
                        {#if pageNumber !== 1}
                            <button class="uk-button uk-button-default" onclick={() => changePage(pageNumber - 1)}>
                                ← Previous page
                            </button>
                        {/if}
                        {#if pageNumber !== pageCount}
                            <button class="uk-button uk-button-default" onclick={() => changePage(pageNumber + 1)}>
                                Next page →
                            </button>
                        {/if}
                    </div>
                {/if}
            </div>
            {#if relays.length === 0}
                <p class="uk-text-center">No relays found.</p>
            {/if}
        {:catch error}
            <p class="uk-text-center uk-text-danger">Error loading relays: {error.message}</p>
        {/await}
    </div>
</div>

<style>
    tr.cursor {
        cursor: pointer;
    }
    th.cursor, span.cursor {
        cursor: pointer;
        user-select: none;
    }
    th.cursor:hover, span.cursor:hover {
        color: #1e87f0;
    }
</style>
