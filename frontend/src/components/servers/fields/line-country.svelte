<script lang="ts">
    import { countryCodeToName, getFlagEmoji } from '@/utils';
    import Icon from '@/components/icon.svelte';

    interface Props {
        country: string;
        largeFlag?: boolean;
    }

    let { country, largeFlag = true }: Props = $props();


    let name = $derived((() => {
        switch (country) {
            case 'TOR':
                return 'TOR';
            case 'YGGDRASIL':
                return 'Yggdrasil';
            default:
                return country && countryCodeToName(country);
        }
    })());
</script>

{#if country}
    <span>
        {#if country === 'TOR'}
            <Icon icon="tor" />
        {:else if country === 'YGGDRASIL'}
            <Icon icon="yggdrasil" />
        {:else}
            <span class:uk-text-large={largeFlag}>
                <Icon icon={getFlagEmoji(country)} />
            </span>
        {/if}
        <span class="uk-text-small ">{name}</span>
    </span>
{/if}
