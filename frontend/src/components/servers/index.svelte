<script lang="ts">
    import { onMount } from 'svelte';
    import type { FetchParams } from '../../database';
    import Filters from './filters.svelte';
    import Table from './table.svelte';

    let params: FetchParams;

    let refreshCounter: number = 0;
    const refresh = function () {
        ++refreshCounter;
    }
    onMount(refresh);

    $: refreshedParams = {
        ...params,
        [Symbol()]: refreshCounter,
    };
</script>

<div uk-grid class="uk-width-1-1">
    <div class="uk-width-1-3@m uk-width-1-1@s">
        <h2 class="uk-text-lead uk-margin-bottom">Filters</h2>
        <Filters bind:params={params} />
    </div>
    <div class="uk-width-expand@m uk-width-1-1@s">
        <div class="uk-width-1-1" uk-grid>
            <h2 class="uk-text-lead uk-width-1-3@s uk-width-expand@m">
                Servers
                &nbsp;
                <span class="pointer" on:click={refresh} uk-tooltip="Refresh">
                    <img width="24" height="24" src="https://img.icons8.com/ios-filled/50/update-left-rotation.png" alt="update-left-rotation"/>
                </span>
            </h2>
        </div>
        <Table params={refreshedParams} />
    </div>
</div>
