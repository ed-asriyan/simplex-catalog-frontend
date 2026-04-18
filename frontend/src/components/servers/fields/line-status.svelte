<script lang="ts">
    import type { Server } from '@/store/servers/servers-store';

    interface Props {
        status?: boolean;
        servers?: Server[];
    }

    let { status, servers }: Props = $props();

    let onlineCount = $derived(servers ? servers.filter(s => s.status).length : 0);
    let offlineCount = $derived(servers ? servers.length - onlineCount : 0);
    let isAggregated = $derived(!!servers && servers.length > 0);
    let allSameStatus = $derived(onlineCount === 0 || offlineCount === 0);

    const ONLINE_STRING = 'Online';
    const OFFLINE_STRING = 'Offline';
</script>

{#if isAggregated}
    {#if allSameStatus}
        <span class={onlineCount > 0 ? 'uk-text-success' : 'uk-text-danger'}>
            {onlineCount > 0 ? ONLINE_STRING : OFFLINE_STRING}
        </span>
    {:else}
        <span class="uk-text-success">{onlineCount} {ONLINE_STRING.toLowerCase()}</span> / <span class="uk-text-danger">{offlineCount} {OFFLINE_STRING.toLowerCase()}</span>
    {/if}
{:else}
    <span class={status ? 'uk-text-success' : 'uk-text-danger'}>
        {status === true ? ONLINE_STRING : status === false ? OFFLINE_STRING : 'Unknown'}
    </span>
{/if}
