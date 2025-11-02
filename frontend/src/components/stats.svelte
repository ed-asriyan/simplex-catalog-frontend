<script lang='ts'>
    import Icon from './icon.svelte';
    import type { CountriesStore } from '../store/countries-store';
    import WorldMap from './world-map.svelte';
    import type { Filter } from '../store/servers-service';

    interface Props {
        countriesStore: CountriesStore;
        onFilterApply?: (filter: Filter) => void;
    }

    let { countriesStore, onFilterApply }: Props = $props();

    let countries = $derived(countriesStore.items);
    let activeCountries = $derived($countries.filter(({ active }) => !!active));
    let activeNotTorCountries = $derived(activeCountries.filter(({ country }) => country !== 'TOR'));
    let activeTorCountries = $derived(activeCountries.filter(({ country }) => country === 'TOR'));
    let activeServersTotal = $derived(activeCountries.reduce((total, { active }) => total + active, 0));
    let activeTorServersTotal = $derived(activeTorCountries.reduce((total, { active }) => total + active, 0));

    let cards = $derived([
        {
            title: 'active servers',
            value: activeServersTotal,
            icon: '⚡',
            onClick: () => onFilterApply?.({ status: true })
        },
        {
            title: 'TOR servers',
            value: activeTorServersTotal,
            icon: 'tor',
            onClick: () => onFilterApply?.({ countries: { inclusive: true, values: ['TOR'] }, status: true })
        },
        {
            title: 'countries',
            value: activeCountries.length,
            icon: '🌐',
            onClick: () => onFilterApply?.({ countries: { inclusive: false, values: ['TOR'] }, status: true })
        },
    ]);

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
        onFilterApply?.({ countries: { inclusive: true, values: [country] }, status: true })
    };
</script>

<div class="uk-grid uk-grid-small uk-child-width-1-5@l uk-child-width-1-4@m uk-child-width-1-3 uk-flex-center" uk-grid uk-height-match="target: > div > .uk-card">
    {#each cards as { icon, title, value, onClick }}
        <div>
            <div class="uk-card uk-card-small uk-card-primary uk-card-body uk-card-hover cursor" onclick={onClick}>
                <div class="uk-heading-small uk-light">{value}</div>
                <p>
                    <Icon icon={icon} />
                    {title}
                </p>
            </div>
        </div>
    {/each}
</div>

<div class="uk-container uk-container-xsmall uk-margin-medium-top">
    <WorldMap countries={countriesOnMap} onCountryClick={onCountryClick} />
</div>