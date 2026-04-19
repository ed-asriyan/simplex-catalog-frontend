<script lang="ts">
    interface Props {
        items: { status: boolean | null }[];
    }
    let { items }: Props = $props();

    let onlineCount = $derived(items.filter(s => s.status).length);
    let offlineCount = $derived(items.filter(s => s.status === false).length);
    let isSingle = $derived(items.length === 1);
</script>

{#if isSingle}
    <span class="uk-badge uk-text-bold" class:uk-badge-success={items[0].status === true} class:uk-badge-danger={items[0].status === false} class:uk-badge-unknown={items[0].status == null}>
        {items[0].status === true ? 'Online' : items[0].status === false ? 'Offline' : 'Unknown'}
    </span>
{:else if onlineCount === items.length}
    <span class="uk-badge uk-badge-success uk-text-bold">Online</span>
{:else if offlineCount === items.length}
    <span class="uk-badge uk-badge-danger uk-text-bold">Offline</span>
{:else}
    <span class="uk-badge uk-badge-success uk-text-bold">{onlineCount} online</span>
    /
    <span class="uk-badge uk-badge-danger uk-text-bold">{offlineCount} offline</span>
{/if}

<style lang="scss">
    .uk-badge-success { background-color: #28a745; }
    .uk-badge-danger  { background-color: #dc3545; }
    .uk-badge-unknown { background-color: #6c757d; }
</style>
