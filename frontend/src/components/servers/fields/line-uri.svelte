<script lang="ts">
    import { type Server, getServerUri } from '../../../store/servers-store';
  import { copyToClipboard } from '../../../utils';
  import Icon from '../../icon.svelte';
    const MAX_LENGTH = 30;

    interface Props {
        server: Server;
    }

    let { server }: Props = $props();

    let copyTimeout: ReturnType<typeof setTimeout> | null = $state(null);
    const copyToClipboardClick = function (str: string) {
        copyToClipboard(str);
        copyTimeout && clearTimeout(copyTimeout);
        copyTimeout = setTimeout(() => {
            copyTimeout = null;
        }, 4000);
    };

    let maskedUri: string = $derived(server.host);
</script>

<span class="pointer uk-text-nowrap" uk-tooltip="Click to copy full URI" onclick={() => copyToClipboardClick(getServerUri(server))}>
    {#if copyTimeout !== null}
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
        <Icon icon="copy" width="12" height="12" />
    {/if}
</span>
