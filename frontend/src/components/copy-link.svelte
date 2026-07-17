<script lang="ts">
    import { copyToClipboard } from '@/utils';
    import Icon from '@/components/icon.svelte';

    interface Props {
        url: string;
        maxLength?: number;
        truncateDirection?: 'start' | 'end';
    }

    let { url, maxLength = 40, truncateDirection = 'start' }: Props = $props();

    let copyTimeout: ReturnType<typeof setTimeout> | null = $state(null);
    const copy = function () {
        copyToClipboard(url);
        copyTimeout && clearTimeout(copyTimeout);
        copyTimeout = setTimeout(() => {
            copyTimeout = null;
        }, 4000);
    };
</script>

<span class="pointer uk-text-nowrap" uk-tooltip="Click to copy URI" onclick={copy}>
    {#if copyTimeout !== null}
        Copied to clipboard
    {:else}
        <a>
            {#if url.length > maxLength}
                {#if truncateDirection === 'start'}
                    &hellip;{url.slice(url.length - maxLength)}
                {:else}
                    {url.slice(0, maxLength)}&hellip;
                {/if}
            {:else}
                {url}
            {/if}
        </a>
        &#8239;
        <Icon icon="copy" />
    {/if}
</span>
