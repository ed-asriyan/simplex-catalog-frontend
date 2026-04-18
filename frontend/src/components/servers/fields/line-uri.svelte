<script lang="ts">
    import { type Server } from '@/store/servers/servers-store';
    import { copyToClipboard } from '@/utils';
    import Icon from '@/components/icon.svelte';

    interface Props {
        server?: Server;
        servers?: Server[];
        maxLength?: number;
    }

    let { server, servers, maxLength = 30 }: Props = $props();

    let allServers: Server[] = $derived(servers || (server ? [server] : []));

    let composedUri: string = $derived(
        allServers.length > 0
            ? `${allServers[0].protocol}://${allServers[0].identity}@${allServers.map(s => s.host).join(',')}`
            : ''
    );

    let displayHost: string = $derived(allServers.map(s => s.host).join(','));

    let copyTimeout: ReturnType<typeof setTimeout> | null = $state(null);
    const copyToClipboardClick = function (str: string) {
        copyToClipboard(str);
        copyTimeout && clearTimeout(copyTimeout);
        copyTimeout = setTimeout(() => {
            copyTimeout = null;
        }, 4000);
    };
</script>

<span class="pointer uk-text-nowrap" uk-tooltip="Click to copy full URI" onclick={() => copyToClipboardClick(composedUri)}>
    {#if copyTimeout !== null}
        Copied to clipboard
    {:else}
        <a>
            {#if displayHost.length > maxLength}
                &hellip;{displayHost.slice(displayHost.length - maxLength, displayHost.length)}
            {:else}
                {displayHost}
            {/if}
        </a>
        &#8239;
        <Icon icon="copy" width="12" height="12" />
    {/if}
</span>
