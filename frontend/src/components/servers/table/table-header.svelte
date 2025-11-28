<script lang="ts">
    import { countryCodeToName, delay, setQueryParam } from '../../../utils';
    import LineCountry from '../fields/line-country.svelte';
    import type { Filter } from '../../../store/servers-service';
    import { countriesStore } from '../../../store/countries-store';
    import { labelsStore } from '../../../store/labels-store';

    interface Props {
        filter: Filter,
        updateFilter: (filter: Filter) => void,
        onAllServerSelected: (value: boolean) => void,
    }

    let { filter, updateFilter, onAllServerSelected }: Props = $props();

    let hostFilter = $derived(filter.host);
    const onHostFilterChange = (value: string) => {
        updateFilter({ ...filter, host: value });
    };


    let protocolFilter = $derived(filter.protocol);
    const onProtocolFilterChange = (value: typeof filter.protocol) => {
        updateFilter({ ...filter, protocol: value });
    };

    let statusFilter: 'any' | 'true' | 'false' | 'unknown' = $derived(filter.status === undefined ? 'any' : filter.status === 'unknown' ? 'unknown' : filter.status ? 'true' : 'false');
    const onStatusFilterChange = (value: typeof statusFilter) => {
        updateFilter({
            ...filter,
            status: value === 'any' ? undefined : value === 'unknown' ? 'unknown' : value === 'true',
        });
    };

    let countriesFilterInclusive = $derived(!!filter.countries?.inclusive);
    let countriesFilterValues = $derived(filter.countries?.values || []);
    const clearCountriesList = () => {
        updateFilter({
            ...filter,
            countries: { inclusive: countriesFilterInclusive, values: [] }
        });
    };
    const onCountriesListChanges = function (country: string) {
        if (filter.countries?.values.includes(country)) {
            updateFilter({
                ...filter,
                countries: { ...filter.countries, values: filter.countries.values.filter(c => c !== country) }
            });
        } else {
            updateFilter({
                ...filter,
                countries: { inclusive: filter.countries?.inclusive || false, values: [...(filter.countries?.values || []), country] }
            });
        }
    };
    const onCountriesInclusiveChange = function () {
        updateFilter({
            ...filter,
            countries: { inclusive: !countriesFilterInclusive, values: filter.countries?.values || [] }
        });
    };

    let infoPageFilter: 'any' | 'true' | 'false' = $derived(filter.infoPageAvailable === undefined ? 'any' : filter.infoPageAvailable ? 'true' : 'false');
    const onInfoPageFilterChange = function (value: typeof infoPageFilter) {
        updateFilter({
            ...filter,
            infoPageAvailable: value === 'any' ? undefined : value === 'true',
        });
    };

    let labelsFilterInclusive = $derived(!!filter.labels?.inclusive);
    let labelsFilterValues = $derived(filter.labels?.values || []);
    const onLabelsInclusiveChange = function () {
        updateFilter({
            ...filter,
            labels: { inclusive: !labelsFilterInclusive, values: filter.labels?.values || [] }
        });
    };
    const clearLabelsList = () => {
        updateFilter({
            ...filter,
            labels: { inclusive: labelsFilterInclusive, values: [] }
        });
    };
    const onLabelsListChanges = function (label: string) {
        if (filter.labels?.values.includes(label)) {
            updateFilter({
                ...filter,
                labels: { ...filter.labels, values: filter.labels.values.filter(c => c !== label) }
            });
        } else {
            updateFilter({
                ...filter,
                labels: { inclusive: filter.labels?.inclusive || false, values: [...(filter.labels?.values || []), label] }
            });
        }
    };


    let countries = $derived(countriesStore.allCountries);
    let countriesSorted = $derived(Array.from($countries).filter(x => x).sort((a, b) => {
        if (a === 'TOR') {
            return -1;
        }
        if (b === 'TOR') {
            return 1;
        }
        return countryCodeToName(a).localeCompare(countryCodeToName(b));
    }));

    let uptime7Filter = $derived(filter.uptime7 === undefined ? '' : (filter.uptime7 * 100).toString());
    const onUptime7FilterChange = function (value: string) {
        updateFilter({
            ...filter,
            uptime7: +value / 100 || undefined
        });
    };
    let uptime30Filter = $derived(filter.uptime30 === undefined ? '' : (filter.uptime30 * 100).toString());
    const onUptime30FilterChange = function (value: string) {
        updateFilter({
            ...filter,
            uptime30: +value / 100 || undefined
        });
    };
    let uptime90Filter = $derived(filter.uptime90 === undefined ? '' : (filter.uptime90 * 100).toString());
    const onUptime90FilterChange = function (value: string) {
        updateFilter({
            ...filter,
            uptime90: +value / 100 || undefined
        });
    };
</script>

<thead>
    <tr>
        <th>
            <input class="pointer"
                type="checkbox"
                onchange={e => onAllServerSelected(e.target.checked)}
            />
        </th>
        <th>
            <buttons class="uk-button uk-button-small uk-button-default uk-width-auto" type="button">
                Labels
                {#if labelsFilterValues.length > 0}
                    <span class="uk-badge">{labelsFilterValues.length}</span>
                {/if}
            </buttons>
            <div uk-dropdown class="uk-overflow-auto"  style="height: 300px; max-height: 50vh">
                <a class="uk-link uk-block" onclick={onLabelsInclusiveChange}>
                    {labelsFilterInclusive ? 'Inclusive' : 'Exclusive'}
                </a>

                {#if labelsFilterValues.length > 0}
                    <a class="uk-link uk-float-right" onclick={clearLabelsList}>Clear</a>
                {/if}

                {#each Object.keys($labelsStore) as label}
                    <div class="uk-margin-small">
                        <input type="checkbox" checked={labelsFilterValues.includes(label)} onchange={() => onLabelsListChanges(label)} />
                        {#if !+labelsFilterInclusive}
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
            <select value={protocolFilter} onchange={e => onProtocolFilterChange(e.target.value)} class="uk-select uk-form-small uk-width-auto">
                <option value="">All</option>
                <option value="smp">SMP</option>
                <option value="xftp">XFTP</option>
            </select>
        </th>
        <th>
            URI
            &nbsp;
            <input class="uk-input uk-form-small uk-width-auto" id="form-uri" type="text" onkeyup={delay((e) => onHostFilterChange(e.target.value), 1500)} value={hostFilter}>
        </th>
        <th>
            <buttons class="uk-button uk-button-small uk-button-default uk-width-auto" type="button">
                Country
                {#if (countriesFilterValues.length || 0) > 0}
                    <span class="uk-badge">{countriesFilterValues.length}</span>
                {/if}
            </buttons>
            <div uk-dropdown class="uk-overflow-auto"  style="height: 300px; max-height: 50vh">
                <a class="uk-link uk-block" onclick={() => onCountriesInclusiveChange()}>
                    {countriesFilterInclusive ? 'Inclusive' : 'Exclusive'}
                </a>

                {#if (countriesFilterValues.length || 0) > 0}
                    <a class="uk-link uk-float-right" onclick={clearCountriesList}>Clear</a>
                {/if}

                {#each countriesSorted as country}
                    <div class="uk-margin-small">
                        <input type="checkbox" checked={countriesFilterValues.includes(country)} onchange={() => onCountriesListChanges(country)} />
                        {#if !+countriesFilterInclusive}
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
            <select value={infoPageFilter} onchange={e => onInfoPageFilterChange(e.target.value)} class="uk-select uk-form-small uk-width-auto">
                <option value="any">Any</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
            </select>
        </th>
        <th>
            Status
            &nbsp;
            <select value={statusFilter} onchange={e => onStatusFilterChange(e.target.value)} class="uk-select uk-form-small uk-width-auto">
                <option value="any">Any</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
                <option value="unknown">Unknown</option>
            </select>
        </th>
        <th>
            Uptime (7d / 30d / 90d)
            <br/>
            <input class="uk-input uk-form-small uk-width-auto" type="number" min="0" max="100" onkeyup={delay((e) => onUptime7FilterChange(e.target.value), 1500)} value={uptime7Filter}>
            <input class="uk-input uk-form-small uk-width-auto" type="number" min="0" max="100" onkeyup={delay((e) => onUptime30FilterChange(e.target.value), 1500)} value={uptime30Filter}>
            <input class="uk-input uk-form-small uk-width-auto" type="number" min="0" max="100" onkeyup={delay((e) => onUptime90FilterChange(e.target.value), 1500)} value={uptime90Filter}>
        </th>
        <th>Last Check</th>
        <th>QR Code</th>
    </tr>
</thead>
