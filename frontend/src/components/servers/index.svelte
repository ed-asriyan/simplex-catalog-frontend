<script lang="ts">
    import { onMount } from 'svelte';
    import { addServer, doesServerExist, type FetchParams } from '../../database';
    import Filters from './filters.svelte';
    import Table from './table.svelte';

    let params: FetchParams;

    const isServerOfficial = function (uri: string): boolean {
        return uri.includes('simplex.im');
    };

    const addServerClick = async function () {
        let input = prompt('Enter SMP or XFTP server URI:');
        input = input?.trim();
        if (!input) return;

        if (isServerOfficial(input)) {
            alert('You entered official SimpleX server. Please add only unofficial SimpleX servers');
            return;
        }

        try {
            if (await doesServerExist(input)) {
                alert('Server already added to the registry');
                return;
            }
            await addServer(input.trim());
            alert('The server is added to the database. If server is available, it will apper in the table in a few minutes');
        } catch (e) {
            if (e.code === '42501') {
                alert('Invalid URI. Please verufy that you entered it correctly.')
            }
            throw e;
        }
    };

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
        <div class="uk-text-lead uk-margin-bottom">Filters</div>
        <Filters bind:params={params} />
    </div>
    <div class="uk-width-expand@m uk-width-1-1@s">
        <div class="uk-width-1-1" uk-grid>
            <div class="uk-text-lead uk-width-1-3@s uk-width-expand@m">
                Servers
                &nbsp;
                <span class="pointer" on:click={refresh} uk-tooltip="Refresh">
                    <img width="24" height="24" src="https://img.icons8.com/ios-filled/50/update-left-rotation.png" alt="update-left-rotation"/>
                </span>
            </div>
            <button class="uk-width-1-3@m uk-width-1-1@s uk-button uk-button-default uk-margin-left uk-margin-remove-right" on:click={addServerClick}>Add server</button>
        </div>
        <Table params={refreshedParams} />
    </div>
</div>
