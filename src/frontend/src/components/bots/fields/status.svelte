<script lang="ts">
    interface Props {
        status: boolean | null;
    }

    let { status }: Props = $props();
</script>

<span class:uk-badge-success={status} class:uk-badge-danger={status === false} class:uk-badge-unknown={status === null} class="uk-badge uk-text-bold">
    {status === true ? 'Online' : status === false ? 'Offline' : 'Unknown'}
</span>

<style lang="scss">
    .uk-badge-success {
        background-color: #28a745;
    }
    .uk-badge-danger {
        background-color: #dc3545;
    }
    .uk-badge-unknown {
        background-color: #6c757d;
    }
</style>