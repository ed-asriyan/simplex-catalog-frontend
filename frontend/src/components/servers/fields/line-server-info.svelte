<script lang="ts">
    import Icon from '@/components/icon.svelte';
    import type { Server } from '@/store/servers/servers-store';

    interface Props {
        server: Server;
        icon: boolean;
    }

    let { server, icon }: Props = $props();

    const httpCountries = ['TOR', 'YGGDRASIL'];

    let urlSchema = $derived(httpCountries.includes(server.country) ? 'http' : 'https');
    let url = $derived(`${urlSchema}://${server.host}`);
</script>

{#if server.infoPageAvailable}
    <a href={url} target="_blank">
        {#if icon}
            <span uk-tooltip="Click to open server info page">
                <Icon icon="link" />
            </span>
        {:else}
            Info page
        {/if}
    </a>
{/if}
