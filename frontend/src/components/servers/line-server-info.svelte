<script lang="ts">
    import type { Server } from '../../database';

    interface Props {
        server: Server;
        icon: boolean;
    }

    let { server, icon }: Props = $props();
</script>

{#if server.infoPageAvailable}
    <a href="https://{server.host.split(':')[0]}" target="_blank">
        {#if icon}
            <img width="20" height="20" src="https://img.icons8.com/ios/50/link--v1.png" alt="link--v1" uk-tooltip="Click to open server info page"/>
        {:else}
            Info page
        {/if}
    </a>
{/if}
