<script lang="ts">
    import { countryCodeToName, getFlagEmoji } from '../../../utils';
    import Icon from '../../icon.svelte';

    interface Props {
        country: string;
        largeFlag?: boolean;
    }

    let { country, largeFlag = true }: Props = $props();

    let name = $derived(country === 'TOR' ? 'TOR' : country && countryCodeToName(country));
</script>

{#if country}
    <span>
        {#if country === 'TOR'}
            <img width="22" height="22" src="https://img.icons8.com/nolan/64/tor-browser.png" alt="tor-browser"/>
        {:else}
            <span class:uk-text-large={largeFlag}>
                <Icon icon={getFlagEmoji(country)} />
            </span>
        {/if}
        <span class="uk-text-small ">{name}</span>
    </span>
{/if}
