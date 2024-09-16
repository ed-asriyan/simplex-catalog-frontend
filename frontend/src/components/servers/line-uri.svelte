<script lang="ts">
    import type { Server, ServerUri } from '../../database';

    export let server: Server;

    let copyTumbler: string = '';
    let timeout: number;
    const copyToClipboard = function (str: string) {
        const input = document.createElement('input');
        input.setAttribute('value', str);
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);

        copyTumbler = str;
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => copyTumbler = '', 4000);
    };

    $: domain = server.parsedUri.domain || `...${server.uri.slice(server.uri.length - 12)}`;
    $: maskedUri =  `${server.parsedUri.type}://${domain}`;;
</script>

<span class="pointer uk-text-break" uk-tooltip="Click to copy full URI" on:click={copyToClipboard(server.uri)}>
    {#if copyTumbler === server.uri}
        Copied to clipboard
    {:else}
        <a>{maskedUri}</a>
    {/if}
</span>
