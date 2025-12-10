<script lang="ts">
    import Icon from '../../icon.svelte';
    import type { Server } from '../../store/servers-store';

    interface Props {
        server: Server;
        icon: boolean;
    }

    let { server, icon }: Props = $props();

    let urlSchema = $derived(server.country === 'TOR' ? 'http' : 'https');
    let url = $derived(`${urlSchema}://${server.host.split(':')[0]}`);
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
