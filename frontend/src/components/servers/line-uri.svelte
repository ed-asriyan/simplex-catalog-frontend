<script lang="ts">
    import type { Server } from '../../database';

    const MAX_LENGTH = 30;

    interface Props {
        server: Server;
    }

    let { server }: Props = $props();

    let copyTimeout: number = $state(NaN);
    const copyToClipboard = function (str: string) {
        navigator.clipboard.writeText(str);
        copyTimeout && clearTimeout(copyTimeout);
        copyTimeout = setTimeout(() => {
            copyTimeout = NaN;
        }, 4000);
    };

    let maskedUri: string = $derived(server.host);
</script>

<span class="pointer uk-text-nowrap" uk-tooltip="Click to copy full URI" onclick={() => copyToClipboard(server.uri)}>
    {#if isFinite(copyTimeout)}
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
