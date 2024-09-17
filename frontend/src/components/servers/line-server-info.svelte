<script lang="ts">
    import type { Server } from '../../database';

    export let server: Server;
    export let icon: boolean;
</script>

{#if server.parsedUri.domain && server.infoPageAvailable}
    <a href="https://{server.parsedUri.domain}" target="_blank">
        {#if icon}
            <img width="20" height="20" src="https://img.icons8.com/ios/50/link--v1.png" alt="link--v1" uk-tooltip="Click to open server info page"/>
        {:else}
            Info page
        {/if}
    </a>
{/if}
