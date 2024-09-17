<script lang="ts">
    import type { Server } from '../../database';

    export let server: Server;
    export let icon: boolean;
</script>

{#if server.parsedUri.domain && server.infoPageAvailable}
    <a href="https://{server.parsedUri.domain}" target="_blank">
        {#if icon}
            🔗
        {:else}
            Info page
        {/if}
    </a>
{/if}
