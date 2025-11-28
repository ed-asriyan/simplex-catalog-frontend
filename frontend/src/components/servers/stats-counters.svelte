<script lang='ts'>
    import { countriesStore } from '../../store/countries-store';
    import type { Filter } from '../../store/servers-service';

    interface Props {
        filter: Filter;
        updateFilter?: (filter: Filter) => void;
    }

    let { updateFilter, filter }: Props = $props();

    let countries = $derived(countriesStore.items);
    let activeCountries = $derived($countries.filter(({ active }) => !!active));
    let activeTorCountries = $derived(activeCountries.filter(({ country }) => country === 'TOR'));
    let activeServersTotal = $derived(activeCountries.reduce((total, { active }) => total + active, 0));
    let activeTorServersTotal = $derived(activeTorCountries.reduce((total, { active }) => total + active, 0));

    let cards = $derived([
        {
            title: 'Active servers',
            value: activeServersTotal,
            onClick: () => updateFilter?.({ ...filter, status: true })
        },
        {
            title: 'TOR servers',
            value: activeTorServersTotal,
            onClick: () => updateFilter?.({ ...filter, countries: { inclusive: true, values: ['TOR'] }, status: true })
        },
        {
            title: 'Total countries',
            value: activeCountries.length,
            onClick: () => updateFilter?.({ ...filter, countries: { inclusive: false, values: ['TOR'] }, status: true })
        },
    ]);
</script>

<div class="uk-margin-small-bottom">
    {#each cards as { title, value, onClick }}
        <span onclick={onClick} class="uk-link uk-text-muted">
            {title}: {value}
        </span>{#if onClick !== cards[cards.length - 1].onClick}&nbsp;·&nbsp;{/if}
    {/each}
</div>
<!-- <div class="uk-grid uk-grid-small uk-child-width-1-5@l uk-child-width-1-4@m uk-child-width-1-3" uk-grid uk-height-match="target: > div > .uk-card">
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
</div> -->
