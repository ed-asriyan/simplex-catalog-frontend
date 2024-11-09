<script lang="ts">
    import type { Server } from '../../database';

    const MAX_LENGTH = 20;

    interface Props {
        server: Server;
    }

    let { server }: Props = $props();

    let copyTumbler: string = $state('');
    let timeout: number;
    const copyToClipboard = function (e: Event, str: string) {
        e.preventDefault();
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

    let maskedUri: string = $derived(server.parsedUri.domain || server.uri.slice(server.uri.length - MAX_LENGTH));
</script>

<span class="pointer uk-text-nowrap" uk-tooltip="Click to copy full URI" onclick={e => copyToClipboard(e, server.uri)}>
    {#if copyTumbler === server.uri}
        Copied to clipboard
    {:else}
        <a>
            {#if maskedUri.length > MAX_LENGTH}
                &hellip;{maskedUri.slice(maskedUri.length - MAX_LENGTH, maskedUri.length)}
            {:else}
                {maskedUri}
            {/if}
        </a>
        &#8239;
        <img width="12" height="12" src="https://img.icons8.com/a7a7a7/material-sharp/24/copy.png" alt="copy--v1"/>
    {/if}
</span>
