<script lang="ts">
    import QRCode from '@castlenine/svelte-qrcode';
    import type { Server } from '@/store/servers/servers-store';
    import { copyToClipboard } from '@/utils';
    import Icon from '@/components/icon.svelte';
    import LineUri from './line-uri.svelte';

    interface Props {
        servers: Server[];
    }

    let { servers }: Props = $props();

    let composedUri: string = $derived(
        servers.length > 0
            ? `${servers[0].protocol}://${servers[0].identity}@${servers.map(s => s.host).join(',')}`
            : ''
    );

    let copyTimeout: ReturnType<typeof setTimeout> | null = $state(null);
    const copyUri = () => {
        copyToClipboard(composedUri);
        copyTimeout && clearTimeout(copyTimeout);
        copyTimeout = setTimeout(() => { copyTimeout = null; }, 3000);
    };
</script>

{#if servers.length > 0}
    <div class="uk-text-center">
        {#key composedUri}
            <QRCode data={composedUri} />
        {/key}
        <div class="uk-margin-small-top uk-margin-small-bottom uk-text-muted uk-text-small">
            {servers.length !== 1 ? 'Combined ' : ''}URI for {servers.length} server{servers.length !== 1 ? 's' : ''}:
        </div>
        <LineUri {servers} />
    </div>
{:else}
    <div class="uk-text-muted uk-padding-small uk-text-center">
        Select at least one server to generate a QR code.
    </div>
{/if}
