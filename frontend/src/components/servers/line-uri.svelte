<script lang="ts">
    import type { Server } from '../../database';

    interface Props {
        server: Server;
    }

    let { server }: Props = $props();

    let copyTumbler: string = $state('');
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

    let domain = $derived(server.parsedUri.domain || `...${server.uri.slice(server.uri.length - 12)}`);
    let maskedUri =  $derived(`${domain}`);;
</script>

<span class="pointer uk-text-nowrap" uk-tooltip="Click to copy full URI" onclick={copyToClipboard(server.uri)}>
    {#if copyTumbler === server.uri}
        Copied to clipboard
    {:else}
        <a>{maskedUri}</a>
        &#8239;
        <img width="12" height="12" src="https://img.icons8.com/a7a7a7/material-sharp/24/copy.png" alt="copy--v1"/>
    {/if}
</span>
