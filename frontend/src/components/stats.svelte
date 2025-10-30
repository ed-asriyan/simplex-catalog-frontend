<script lang='ts'>
    import Icon from './icon.svelte';
    import type { CountriesStore } from '../store/countries-store';

    interface Props {
        countriesStore: CountriesStore;
    }

    let { countriesStore }: Props = $props();

    let countries = $derived(countriesStore.items);
    let activeCountries = $derived($countries.filter(({ active }) => !!active));
    let activeServersTotal = $derived(activeCountries.reduce((total, { active }) => total + active, 0));
    let activeTorServersTotal = $derived(activeCountries.filter(({ country }) => country === 'TOR').reduce((total, { active }) => total + active, 0));
    let activeNotTorCountries = $derived(activeCountries.filter(({ country }) => country !== 'TOR').reduce((total, { active }) => total + active, 0));

    let cards = $derived([
        {
            title: 'active servers',
            value: activeServersTotal,
            icon: '⚡',
        },
        {
            title: 'TOR servers',
            value: activeTorServersTotal,
            icon: 'tor',
        },
        {
            title: 'countries',
            value: activeNotTorCountries,
            icon: '🌐',
        },
    ])
</script>

<div class="uk-grid uk-grid-small uk-child-width-1-5@l uk-child-width-1-4@m uk-child-width-1-3 uk-flex-center" uk-grid uk-height-match="target: > div > .uk-card">
    {#each cards as { icon, title, value }}
        <div>
            <div class="uk-card uk-card-small uk-card-primary uk-card-body uk-card-hover">
                <div class="uk-heading-medium uk-light">{value}</div>
                <p>
                    <Icon icon={icon} />
                    {title}
                </p>
            </div>
        </div>
    {/each}
</div>