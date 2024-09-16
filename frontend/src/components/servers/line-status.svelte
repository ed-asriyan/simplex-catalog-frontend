<script lang="ts">
    export let status: boolean;
</script>

<span class={status ? 'uk-text-success' : 'uk-text-danger'}>
    {status === true ? 'Active' : status === false ? 'Inactive' : 'Unknown'}
</span>
