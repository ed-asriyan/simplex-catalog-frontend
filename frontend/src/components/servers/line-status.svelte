<script lang="ts">
    interface Props {
        status: boolean;
    }

    let { status }: Props = $props();
</script>

<span class={status ? 'uk-text-success' : 'uk-text-danger'}>
    {status === true ? 'Active' : status === false ? 'Inactive' : 'Unknown'}
</span>
