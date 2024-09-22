<script lang="ts">
    import { camelToSnakeCase, countryCodeToName, delay, getFlagEmoji } from '../../utils';
    import { type FetchParams, fetchCountries } from '../../database';
    import { get } from 'svelte/store';
    import { flagStore } from './flagged';
    import { QueryStore, QueryStoreList } from '../../query-store';

    export let params: FetchParams;

    $: params = {
        limit: 0,
        offset: 0,
        filters: function (q: any) {
            if (this[typeFilterSymbol]) {
                q.like('uri', this[typeFilterSymbol] === 'smp' ? 'smp://%' : 'xftp://%')
            }
            if (this[uriFilterSymbol]) {
                q.like('uri', this[uriFilterSymbol]);
            }
            const filteredCountriesFilter = this[countriesFilterSymbol].filter(x => x);
            if (filteredCountriesFilter.length) {
                q.in('country', filteredCountriesFilter);
            }
            if (this[statusFilterSymbol] !== 'any') {
                q.eq('status', this[statusFilterSymbol] === '1');
            }
            if (this[infoPageFilterSymbol] !== 'any') {
                q.eq('info_page_available', this[infoPageFilterSymbol] === '1');
            }
            if (this[flagedFilterSymbol] !== 'any') {
                const filter = this[flagedFilterSymbol] === 'flagged' ? 'eq' : 'neq';
                for (const uri of get(flagStore)) {
                    q[filter]('uri', uri);
                }
            }
            return q;
        },
        modifyers: function (q: any) {
            if (this[sortColumnSymbol]) {
                q.order(camelToSnakeCase(this[sortColumnSymbol]), { ascending: this[sortDirectionSymbol] === 'asc' });
            }
            return q;
        },
        [typeFilterSymbol]: $typeFilter,
        [uriFilterSymbol]: $uriFilter,
        [countriesFilterSymbol]: $countriesFilter,
        [statusFilterSymbol]: $statusFilter,
        [infoPageFilterSymbol]: $infoPageFilter,
        [flagedFilterSymbol]: $flagedFilter,
        [sortColumnSymbol]: $sortColumn,
        [sortDirectionSymbol]: $sortDirection,
    };

    const typeFilterSymbol = Symbol();
    const typeFilter = new QueryStore('filter-type', 'smp');

    const uriFilterSymbol = Symbol();
    const uriFilter = new QueryStore('filter-uri', '');

    const countriesFilterSymbol = Symbol();
    const countriesFilter = new QueryStoreList('filter-country', []);

    const statusFilterSymbol = Symbol();
    const statusFilter = new QueryStore('filter-status', '1');

    const infoPageFilterSymbol = Symbol();
    const infoPageFilter = new QueryStore('filter-info-page', 'any');

    const flagedFilterSymbol = Symbol();
    const flagedFilter = new QueryStore('filter-flagged', 'any');

    const sortColumnSymbol = Symbol();
    const sortColumn = new QueryStore('filter-sort-column', 'lastCheck');

    const sortDirectionSymbol = Symbol();
    const sortDirection = new QueryStore('filter-sort-direction', 'desc');


    $: _uriFilter = $uriFilter;
</script>

<form class="uk-form-stacked">
    <div class="uk-margin">
        <button class="uk-button uk-button-default" class:uk-button-secondary={$typeFilter === 'smp'} on:click|preventDefault={() => $typeFilter = 'smp'}>SMP</button>
        <button class="uk-button uk-button-default" class:uk-button-secondary={$typeFilter === 'xftp'}  on:click|preventDefault={() => $typeFilter = 'xftp'}>XFTP</button>
    </div>

    <div class="uk-margin">
        <label class="uk-form-label" for="form-uri">
            URI (like <a href="https://www.postgresqltutorial.com/postgresql-tutorial/postgresql-like" target="_blank">%Postgres% syntax</a>):
        </label>
        <div class="uk-form-controls">
            <input class="uk-input" id="form-uri" type="text" on:keyup={delay(() => $uriFilter = _uriFilter, 1500)} bind:value={_uriFilter}>
        </div>
    </div>

    <div class="uk-margin">
        <label class="uk-form-label" for="form-country">
            Countries:
            <a class="uk-link uk-float-right" on:click={() => $countriesFilter = []}>Clear</a>
        </label>
        {#await fetchCountries() }
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
                    <option value="lastCheck">Last check</option>
                    <option value="statusSince">Status since</option>
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
