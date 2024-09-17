<script lang="ts">
    import { countryCodeToName, getFlagEmoji } from '../../utils';

    export let country: string;

    $: name = country && countryCodeToName(country);
</script>

{#if country}
    <span uk-tooltip={name} class="uk-text-large">
        {#if country === 'TOR'}
            <img width="22" height="22" src="https://img.icons8.com/nolan/64/tor-browser.png" alt="tor-browser"/>
        {:else}
            {getFlagEmoji(country)}
        {/if}
    </span>
{/if}
