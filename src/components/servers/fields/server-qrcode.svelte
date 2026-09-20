<script lang="ts">
    import QRCode from '@castlenine/svelte-qrcode';
    import type { Server } from '@/store/servers/servers-store';
    import LineUri from './line-uri.svelte';

    interface Props {
        server: Server;
    }

    let { server }: Props = $props();

    let composedUri: string = $derived(`${server.protocol}://${server.identity}@${server.host}`);
</script>

<div class="uk-text-center">
    {#key composedUri}
        <QRCode data={composedUri} />
    {/key}
    <div class="uk-margin-small-top uk-margin-small-bottom uk-text-muted uk-text-small">
        URI:
    </div>
    <LineUri {server} />
</div>
