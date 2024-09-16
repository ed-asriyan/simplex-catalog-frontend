<script lang="ts">
    import { addServer, doesServerExist, type FetchParams, type Server } from '../../database';
    import Filters from './filters.svelte';
    import Table from './table.svelte';

    let params: FetchParams;

    const addServerClick = async function () {
        const input = prompt('Enter SMP or XFTP server URI:');
        if (!input) return;

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
</script>

<div uk-grid>
    <div class="uk-width-1-3@m">
        <div class="uk-text-lead uk-margin-bottom">Filters</div>
        <Filters bind:params={params} />
    </div>
    <div class="uk-width-expand@m">
        <div class="uk-text-lead uk-width-1-1">
            Servers
            <button class="uk-button uk-button-default uk-margin-auto-left" on:click={addServerClick}>Add server</button>
        </div>
        <Table params={params} />
    </div>
</div>
