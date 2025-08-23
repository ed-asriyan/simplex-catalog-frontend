<script lang="ts">
    import { countryCodeToName, delay } from '../../utils';
    import { QueryStore, QueryStoreList } from '../../query-store';
    import { labelsStore, labels } from '../../store/labels-store';
    import LineCountry from './fields/line-country.svelte';
    import type { Filter } from '../../store/servers-service';

    interface Props {
        filter: Filter,
        onAllServerSelected: (value: boolean) => void,
        countries: readonly string[],
    }

    let { filter = $bindable(), onAllServerSelected, countries }: Props = $props();

    let allServersSelected: boolean = $state(false);

    const protocolFilter = new QueryStore('filter-protocol', '', ['smp', 'xftp', '']);
    const hostFilter = new QueryStore('filter-host', '');
    const countriesInclusiveFilter = new QueryStore('filter-countries-inclusive', '1', ['1', '0']);
    const countriesFilter = new QueryStoreList('filter-country', []);
    const statusFilter = new QueryStore('filter-status', '1', ['0', '1', 'unknown', 'any']);
    const infoPageFilter = new QueryStore('filter-info-page', 'any', ['0', '1', 'any']);
    const labelsInclusiveFilter = new QueryStore('filter-labels-inclusive', '0', ['1', '0']);
    const labelsFilter = new QueryStoreList('filter-labels', ['ignored']);
    const uptime7Filter = new QueryStore('filter-uptime7', '');
    const uptime30Filter = new QueryStore('filter-uptime30', '');
    const uptime90Filter = new QueryStore('filter-uptime90', '');

    $effect(() => {
        filter = {
            uuids: !$labelsFilter.length ? null : {
                inclusive: $labelsInclusiveFilter === '1',
                values: $labelsFilter.reduce((acc, label) => {
                    return [...acc, ...Array.from($labelsStore[label])];
                }, []),
            },
            protocol: $protocolFilter === '' ? null : ($protocolFilter === 'smp' ? 'smp' : 'xftp'),
            identity: null,
            host: $hostFilter,
            countries: !$countriesFilter.length ? null : {
                inclusive: $countriesInclusiveFilter === '1',
                values: $countriesFilter,
            },
            status: $statusFilter === 'any' ? null : ($statusFilter === 'unknown' ? 'unknown' : $statusFilter === '1'),
            infoPageAvailable: $infoPageFilter === 'any' ? null : $infoPageFilter === '1',
            uptime7: $uptime7Filter === '' ? null : $uptime7Filter / 100,
            uptime30: $uptime30Filter === '' ? null : $uptime30Filter / 100,
            uptime90: $uptime90Filter === '' ? null : $uptime90Filter / 100,
        }
    })

    $effect(() => {
        onAllServerSelected(allServersSelected);
    });

    let _hostFilter: string = $state('');
    $effect(() => {
        _hostFilter = $hostFilter;
    });

    let _uptime7Filter: string = $state('');
    $effect(() => {
        _uptime7Filter = $uptime7Filter;
    });

    let _uptime30Filter: string = $state('');
    $effect(() => {
        _uptime30Filter = $uptime30Filter;
    });

    let _uptime90Filter: string = $state('');
    $effect(() => {
        _uptime90Filter = $uptime90Filter;
    });

    const onCountriesListChanges = function (country: string) {
        if ($countriesFilter.includes(country)) {
            $countriesFilter = $countriesFilter.filter(c => c !== country);
        } else {
            $countriesFilter = [...$countriesFilter, country];
        }
    };

    const onLabelsListChanges = function (label: string) {
        if ($labelsFilter.includes(label)) {
            $labelsFilter = $labelsFilter.filter(c => c !== label);
        } else {
            $labelsFilter = [...$labelsFilter, label];
        }
    };

    let countriesSorted = $derived(Array.from(countries).filter(x => x).sort((a, b) => {
        if (a === 'TOR') {
            return -1;
        }
        if (b === 'TOR') {
            return 1;
        }
        return countryCodeToName(a).localeCompare(countryCodeToName(b));
    }));
</script>

<thead>
    <tr>
        <th>
            <input class="pointer"
                type="checkbox"
                uk-tooltip={allServersSelected ? "Unselect all" : "Select all"}
                bind:checked={allServersSelected}
            />
        </th>
        <th>
            <buttons class="uk-button uk-button-small uk-button-default uk-width-auto" type="button">
                Labels
                {#if $labelsFilter.length > 0}
                    <span class="uk-badge">{$labelsFilter.length}</span>
                {/if}
            </buttons>
            <div uk-dropdown class="uk-overflow-auto"  style="height: 300px; max-height: 50vh">
                <a class="uk-link uk-block" onclick={() => $labelsInclusiveFilter = ($labelsInclusiveFilter === '1' ? '0' : '1').toString()}>
                    {$labelsInclusiveFilter === '1' ? 'Inclusive' : 'Exclusive'}
                </a>

                {#if $labelsFilter.length > 0}
                    <a class="uk-link uk-float-right" onclick={$labelsFilter = []}>Clear</a>
                {/if}

                {#each labels as label}
                    <div class="uk-margin-small">
                        <input type="checkbox" checked={$labelsFilter.includes(label)} onchange={() => onLabelsListChanges(label)} />
                        {#if !+$labelsInclusiveFilter}
                            Not
                        {/if}
                        {label}
                    </div>
                {/each}
            </div>
        </th>
        <th>
            Type
            &nbsp;
            <select bind:value={$protocolFilter} class="uk-select uk-form-small uk-width-auto">
                <option value="">All</option>
                <option value="smp">SMP</option>
                <option value="xftp">XFTP</option>
            </select>
        </th>
        <th>
            URI
            &nbsp;
            <input class="uk-input uk-form-small uk-width-auto" id="form-uri" type="text" onkeyup={delay(() => $hostFilter = _hostFilter, 1500)} bind:value={_hostFilter}>
        </th>
        <th>
            <buttons class="uk-button uk-button-small uk-button-default uk-width-auto" type="button">
                Country
                {#if $countriesFilter.length > 0}
                    <span class="uk-badge">{$countriesFilter.length}</span>
                {/if}
            </buttons>
            <div uk-dropdown class="uk-overflow-auto"  style="height: 300px; max-height: 50vh">
                <a class="uk-link uk-block" onclick={() => $countriesInclusiveFilter = ($countriesInclusiveFilter === '1' ? '0' : '1').toString()}>
                    {$countriesInclusiveFilter === '1' ? 'Inclusive' : 'Exclusive'}
                </a>

                {#if $countriesFilter.length > 0}
                    <a class="uk-link uk-float-right" onclick={$countriesFilter = []}>Clear</a>
                {/if}

                {#each countriesSorted as country}
                    <div class="uk-margin-small">
                        <input type="checkbox" checked={$countriesFilter.includes(country)} onchange={() => onCountriesListChanges(country)} />
                        {#if !+$countriesInclusiveFilter}
                            Not
                        {/if}
                        <LineCountry country={country} largeFlag={false}/>
                    </div>
                {/each}
            </div>
        </th>
        <th>
            Info page
            &nbsp;
            <select bind:value={$infoPageFilter} class="uk-select uk-form-small uk-width-auto">
                <option value="any">Any</option>
                <option value="1">Yes</option>
                <option value="0">No</option>
            </select>
        </th>
        <th>
            Status
            &nbsp;
            <select bind:value={$statusFilter} class="uk-select uk-form-small uk-width-auto">
                <option value="any">Any</option>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
                <option value="unknown">Unknown</option>
            </select>
        </th>
        <th>
            Uptime (7d / 30d / 90d)
            <br/>
            <input class="uk-input uk-form-small uk-width-auto" type="number" min="0" max="100" onkeyup={delay(() => $uptime7Filter = _uptime7Filter, 1500)} bind:value={_uptime7Filter}>
            <input class="uk-input uk-form-small uk-width-auto" type="number" min="0" max="100" onkeyup={delay(() => $uptime30Filter = _uptime30Filter, 1500)} bind:value={_uptime30Filter}>
            <input class="uk-input uk-form-small uk-width-auto" type="number" min="0" max="100" onkeyup={delay(() => $uptime90Filter = _uptime90Filter, 1500)} bind:value={_uptime90Filter}>
        </th>
        <th>Last Check</th>
        <th>QR Code</th>
    </tr>
</thead>
