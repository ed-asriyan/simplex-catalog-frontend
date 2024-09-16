<script lang="ts">
    import type { Server } from '../../database';

    export let server: Server;
    export let icon: boolean;
</script>

{#if server.parsedUri.domain}
    <a href="https://{server.parsedUri.domain}" target="_blank" uk-tooltip="May be unavailable">
        {#if icon}
            🔗
        {:else}
            Info page
        {/if}
    </a>
{/if}
