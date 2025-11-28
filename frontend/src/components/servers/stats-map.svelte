<script lang='ts'>
    import { countriesStore } from '../../store/countries-store';
    import WorldMap from './world-map.svelte';
    import type { Filter } from '../../store/servers-service';

    interface Props {
        filter: Filter;
        updateFilter?: (filter: Filter) => void;
    }

    let { updateFilter, filter }: Props = $props();
    let countries = $derived(countriesStore.items);
    let activeCountries = $derived($countries.filter(({ active }) => !!active));
    let activeNotTorCountries = $derived(activeCountries.filter(({ country }) => country !== 'TOR'));

    let maxNumberOfActiveServers = $derived(Math.max(...activeNotTorCountries.map(({ active }) => active)));

    let countriesOnMap = $derived(
        activeNotTorCountries
            .filter(({ active }) => active)
            .map(({ country, active }) => ({
                code: country.toUpperCase(),
                color: `#1e87f0${Math.floor((active / maxNumberOfActiveServers) * 175 + 80).toString(16).padStart(2, '0')}`,
                text: `${active} servers`
            }))
    );

    const onCountryClick = (country: string) => {
        updateFilter?.({ ...filter, countries: { inclusive: true, values: [country] }, status: true })
    };
</script>

<div class="uk-container uk-container-xsmall uk-margin-medium-top">
    <WorldMap countries={countriesOnMap} onCountryClick={onCountryClick} />
</div>