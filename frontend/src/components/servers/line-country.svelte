<script lang="ts">
    import * as Icon from 'svelte-flags';

    export let country: string;

    function capitalizeFirstLetter(s: string) {
        return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    }

    $: icon = country && Icon[capitalizeFirstLetter(country)];

    let name: string;
    $: if (country) {
        try {
            name = new Intl.DisplayNames(['en'], {
                type: 'region',
            }).of(country);
        } catch {
        }
        name = name || country;
    }
</script>

{#if country}
    <span uk-tooltip={name}>
        {#if country === 'TOR'}
            <img width="22" height="22" src="https://img.icons8.com/nolan/64/tor-browser.png" alt="tor-browser"/>
        {:else}
            {#if icon}
                <svelte:component this={icon} size="20" />
            {:else}
                {country}
            {/if}
        {/if}
    </span>
{/if}
