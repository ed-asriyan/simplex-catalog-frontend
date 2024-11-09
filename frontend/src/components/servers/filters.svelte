<script lang="ts">
    import { countryCodeToName, delay, getFlagEmoji } from '../../utils';
    import { type FetchParams, fetchCountries } from '../../database';
    import { get } from 'svelte/store';
    import { flagStore } from './flagged';
    import { QueryStore, QueryStoreList } from '../../query-store';

    interface Props {
        params: FetchParams;
    }

    let { params = $bindable() }: Props = $props();

    const typeFilter = new QueryStore('filter-type', 'smp');
    const uriFilter = new QueryStore('filter-uri', '');
    const countriesFilter = new QueryStoreList('filter-country', []);
    const statusFilter = new QueryStore('filter-status', '1');
    const infoPageFilter = new QueryStore('filter-info-page', 'any');
    const flagedFilter = new QueryStore('filter-flagged', 'any');
    const sortColumn = new QueryStore('filter-sort-column', 'lastCheck');
    const sortDirection = new QueryStore('filter-sort-direction', 'desc');


    const createFilter = function(params: {
        type?: string,
        uri?: string,
        countries?: string[],
        status?: boolean,
        infoPage?: boolean,
        flaged?: boolean,
    }) {
        return (q: any) => {
            if (params.type) {
                q.like('uri', params.type === 'smp' ? 'smp://%' : 'xftp://%')
            }
            if (params.uri) {
                q.like('uri', params.uri);
            }
            const filteredCountriesFilter = params.countries?.filter(x => x);
            if (filteredCountriesFilter?.length) {
                q.in('country', filteredCountriesFilter);
            }
            if (params.status !== undefined) {
                q.eq('status', params.status);
            }
            if (params.infoPage !== undefined) {
                q.eq('info_page_available', params.infoPage);
            }
            if (params.flaged !== undefined) {
                const flaggedServers = get(flagStore);
                if (params.flaged) {
                    q.in('uuid', flaggedServers);
                } else {
                    for (const uuid of flaggedServers) {
                        q.neq('uuid', uuid);
                    }
                }
            }
            return q;
        }
    };

    const createModifiers = function(params: {
        sortColumn?: string,
        sortDirection?: 'asc' | 'desc',
    }) {
        return (q: any) => {
            if (params.sortColumn) {
                q.order(params.sortColumn, { ascending: params.sortColumn === 'asc' });
            }
            return q;
        }
    };

    $effect(() => {
        params = {
            limit: 0,
            offset: 0,
            filters: createFilter({
                type: $typeFilter,
                uri: $uriFilter,
                countries: $countriesFilter,
                status: $statusFilter === '1' ? true : $statusFilter === '0' ? false : undefined,
                infoPage: $infoPageFilter === '1' ? true : $infoPageFilter === '0' ? false : undefined,
                flaged: $flagedFilter === 'flagged' ? true : $flagedFilter === 'unflagged' ? false : undefined,
            }),
            modifyers: createModifiers({
                sortColumn: $sortColumn,
                sortDirection: $sortDirection,
            }),
        };
    });

    let _uriFilter;
    $effect(() => {
        _uriFilter = $uriFilter;
    });
</script>

<form class="uk-form-stacked">
    <div class="uk-margin">
        <button class="uk-button uk-button-default" class:uk-button-secondary={$typeFilter === 'smp'} onclick={e => { e.preventDefault(); $typeFilter = 'smp'}}>SMP</button>
        <button class="uk-button uk-button-default" class:uk-button-secondary={$typeFilter === 'xftp'}  onclick={e => {e.preventDefault(); $typeFilter = 'xftp'}}>XFTP</button>
    </div>

    <div class="uk-margin">
        <label class="uk-form-label" for="form-uri">
            URI (like <a href="https://www.postgresqltutorial.com/postgresql-tutorial/postgresql-like" target="_blank">%Postgres% syntax</a>):
        </label>
        <div class="uk-form-controls">
            <input class="uk-input" id="form-uri" type="text" onkeyup={delay(() => $uriFilter = _uriFilter, 1500)} bind:value={_uriFilter}>
        </div>
    </div>

    <div class="uk-margin">
        <label class="uk-form-label" for="form-country">
            Countries:
            <a class="uk-link uk-float-right" onclick={() => $countriesFilter = []}>Clear</a>
        </label>
        {#await fetchCountries()}
            <div uk-spinner></div>
        {:then countries}
            <select multiple class="uk-select" id="form-country" bind:value={$countriesFilter}>
                {#if countries.has('TOR')}
                    <option value="TOR">{ getFlagEmoji('TOR') } TOR</option>
                {/if}
                {#each countries as country (country)}
                    {#if country && country !== 'TOR'}
                        <option value={country}>{ getFlagEmoji(country) } { countryCodeToName(country) }</option>
                    {/if}
                {/each}
            </select>
        {/await}
    </div>

    <div class="uk-margin">
        <label class="uk-form-label" for="form-status">Status</label>
        <div class="uk-form-controls">
            <select class="uk-select" id="form-status" bind:value={$statusFilter}>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
                <option value="any">Any</option>
            </select>
        </div>
    </div>

    <div class="uk-margin">
        <label class="uk-form-label" for="form-info-page">Info page</label>
        <div class="uk-form-controls">
            <select class="uk-select" id="form-info-page" bind:value={$infoPageFilter}>
                <option value="1">Show servers only with info page</option>
                <option value="0">Show servers only without info page</option>
                <option value="any">Any</option>
            </select>
        </div>
    </div>

    <div class="uk-margin">
        <label class="uk-form-label" for="form-flag">Flag</label>
        <div class="uk-form-controls">
            <select class="uk-select" id="form-flag" bind:value={$flagedFilter}>
                <option value="any">All</option>
                <option value="flagged">Show flagged only</option>
                <option value="unflagged">Show unflagged only</option>
            </select>
        </div>
    </div>

    <div class="uk-margin uk-column-1-2@m">
        <div>
            <label class="uk-form-label" for="form-sort-column">Sort by</label>
            <div class="uk-form-controls">
                <select class="uk-select" id="form-sort-column" bind:value={$sortColumn}>
                    <option value="uri">URI</option>
                    <option value="status">Status</option>
                    <option value="last_check">Last check</option>
                    <option value="uptime7">Uptime 7d</option>
                    <option value="uptime30">Uptime 30d</option>
                    <option value="uptime90">Uptime 90d</option>
                </select>
            </div>
        </div>
        <div class="uk-margin-top">
            <label class="uk-form-label" for="form-sort-direction">Direction</label>
            <div class="uk-form-controls">
                <select class="uk-select" id="form-sort-direction" bind:value={$sortDirection}>
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                </select>
            </div>
        </div>
    </div>
</form>
