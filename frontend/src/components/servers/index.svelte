<script lang="ts">
    import { onMount } from 'svelte';
    import Table from './table.svelte';

    let refreshCounter: number = $state(0);
    const refresh = function () {
        ++refreshCounter;
    }
    onMount(refresh);
</script>

<div class="uk-width-expand">
    <Table />
</div>
