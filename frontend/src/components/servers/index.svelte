<script lang="ts">
    import StatsMap from './stats-map.svelte';
    import StatsCounters from './stats-counters.svelte';
    import ServersTable from './table/index.svelte';
    import { type Filter, type Sort } from '../../store/servers-service';
    import { serversService } from '../../store/servers-service';
    import { setQueryParam } from '../../utils';
    import { labelsStore } from '../../store/labels-store';
    import { onMount } from 'svelte';

    let { route } = $props();

    let params = $derived(route.result.querystring.params);

    const addServerClick = async function () {
        const input = prompt('Enter SMP or XFTP server URI:')?.trim();
        if (!input) return;

        try {
            await serversService.addServer(input.trim());
            alert('The server is added to the database. If the server is available, it will soon appear in the table for everyone.');
        } catch (e) {
            alert(e.message);
            throw e;
        }
    };

    const generateFilter = function (params: Record<string, string>): Filter {
        return {
            labels: params.filterLabelsList ? {
                inclusive: params.filterLabelsInclusive === 'true',
                values: decodeURIComponent(params.filterLabelsList).split(','),
            } : undefined,
            protocol: params.filterProtocol as 'smp' | 'xftp' || undefined,
            infoPageAvailable: params.filterInfoPage === 'true' ? true : params.filterInfoPage === 'false' ? false : undefined,
            identity: params.filterIdentity || undefined,
            host: params.filterHost || undefined,
            countries: params.filterCountriesList ? {
                inclusive: params.filterCountriesInclusive === 'true',
                values: decodeURIComponent(params.filterCountriesList).split(','),
            } : undefined,
            status: params.filterStatus === 'true' ? true : params.filterStatus === 'false' ? false : undefined,
            uptime7: +params.filterUptime7 || undefined,
            uptime30: +params.filterUptime30 || undefined,
            uptime90: +params.filterUptime90 || undefined,
        };
    };

    onMount(() => {
        const generatedFilter = generateFilter(params);
        if (Object.values(generatedFilter || {}).filter(x => x !== undefined).length === 0) {
            updateFilter(JSON.parse(localStorage.getItem('serversFilter') || '{}') as Filter);
        }
    });

    let refreshT: number = $state(0);
    let filter: Filter = $derived({
        [Symbol()]: refreshT,
        [Symbol()]: $labelsStore,
        ...generateFilter(params),
    });

    let sort: Sort = $derived({
        field: params.sortField || 'last_check',
        order: params.sortOrder || 'desc',
    });

    const updateFilter = (newFilter: Filter) => {
        localStorage.setItem('serversFilter', JSON.stringify(newFilter));
        setQueryParam(route, {
            filterProtocol: newFilter.protocol === undefined ? '' : newFilter.protocol,
            filterLabelsList: newFilter.labels ? newFilter.labels.values.join(',') : '',
            filterLabelsInclusive: newFilter.labels ? String(newFilter.labels.inclusive) : '',
            filterIdentity: newFilter.identity === undefined ? '' : newFilter.identity,
            filterInfoPage: newFilter.infoPageAvailable === undefined ? '' : String(newFilter.infoPageAvailable),
            filterHost: newFilter.host === undefined ? '' : newFilter.host,
            filterCountriesList: newFilter.countries?.values.join(',') || '',
            filterCountriesInclusive: newFilter.countries?.inclusive?.toString() || '',
            filterStatus: newFilter.status === undefined ? '' : String(newFilter.status),
            filterUptime7: newFilter.uptime7 === undefined ? '' : String(newFilter.uptime7),
            filterUptime30: newFilter.uptime30 === undefined ? '' : String(newFilter.uptime30),
            filterUptime90: newFilter.uptime90 === undefined ? '' : String(newFilter.uptime90),
        });
    }

    let pageNumber: number = $derived(+params.pageNumber || 1);
    let pageSize: number = $derived(+params.pageSize || 50);

    const updateSort = (newSort: Sort) => {
        setQueryParam(route, {
            'sortField': newSort.field,
            'sortOrder': newSort.order,
        });
    };

    const updatePagination = (newPageNumber: number, newPageSize: number) => {
        setQueryParam(route, {
            'pageNumber': String(newPageNumber),
            'pageSize': String(newPageSize),
        });
    };

    const refresh = function () {
        refreshT++;
    };
</script>

<div class="uk-section uk-section-secondary uk-section-small">
    <div class="uk-container">
        <div class="uk-grid-medium uk-child-width-expand@s" uk-grid>
            <div>
                <h1 class="uk-heading-small">🌐 Servers Catalog</h1>
                <div class="uk-margin-bottom">
                    Discover and share community-run <a href="https://simplex.chat/docs/server.html#overview" target="_blank">SMP</a> and <a href="https://simplex.chat/docs/xftp-server.html#overview" target="_blank">XFTP</a> servers.
                    <br/>
                    Here anyone can anonymously add servers to the public list. The availability of each server is checked periodically.
                </div>
                <StatsCounters {updateFilter} {filter} />
                <button class="uk-button uk-button-default uk-margin" onclick={addServerClick}>Add server anonymously</button>
            </div>
            <div>
                <StatsMap {updateFilter} {filter} />
            </div>
        </div>
    </div>
</div>

<div class="uk-section uk-section-default">
    <div class="uk-container uk-container-expand">
        <ServersTable {updateFilter} {updatePagination} {updateSort} {filter} {sort} {pageNumber} {pageSize} {refresh} />
    </div>
</div>
