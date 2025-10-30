<script lang="ts">
    import Icon from '../../icon.svelte';
    import type { Server } from '../../store/servers-store';

    interface Props {
        server: Server;
        icon: boolean;
    }

    let { server, icon }: Props = $props();
</script>

{#if server.infoPageAvailable}
    <a href="https://{server.host.split(':')[0]}" target="_blank">
        {#if icon}
            <span uk-tooltip="Click to open server info page">
                <Icon icon="link" />
            </span>
        {:else}
            Info page
        {/if}
    </a>
{/if}
