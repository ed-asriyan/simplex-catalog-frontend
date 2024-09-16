<script lang="ts">
  import { camelToSnakeCase, delay } from '../../utils';
    import type { FetchParams, Column } from '../../database';

    export let params: FetchParams;

    $: params = {
        limit: 0,
        offset: 0,
        filters: function (q: any) {
            if (this.typeFilter) {
                q.like('uri', this.typeFilter === 'smp' ? 'smp://%' : 'xftp://%')
            }
            if (this.uriFilter) {
                q.like('uri', this.uriFilter);
            }
            if (this.statusFilter !== null) {
                q.eq('status', this.statusFilter);
            }
            return q;
        },
        modifyers: function (q: any) {
            if (this.sortColumn) {
                q.order(camelToSnakeCase(this.sortColumn), { ascending: sortDirection === 'asc' });
            }
            return q;
        },
        typeFilter,
        uriFilter,
        statusFilter,
        sortColumn,
        sortDirection,
    };

    let typeFilter: 'smp' | 'xftp' = 'smp';

    let uriFilter: string = '';
    let statusFilter: boolean | null = true;

    let sortColumn: Column | null = 'lastCheck';
    let sortDirection: 'asc' | 'desc' = 'desc';

    let _uriFilter: string = '';
</script>

<form class="uk-form-stacked">
    <div class="uk-margin">
        <button class="uk-button uk-button-default" class:uk-button-secondary={typeFilter === 'smp'} on:click|preventDefault={() => typeFilter = 'smp'}>SMP</button>
        <button class="uk-button uk-button-default" class:uk-button-secondary={typeFilter === 'xftp'}  on:click|preventDefault={() => typeFilter = 'xftp'}>XFTP</button>
    </div>

    <div class="uk-margin">
        <label class="uk-form-label" for="form-uri">
            URI (like <a href="https://www.postgresqltutorial.com/postgresql-tutorial/postgresql-like" target="_blank">%Postgres% syntax</a>):
        </label>
        <div class="uk-form-controls">
            <input class="uk-input" id="form-uri" type="text" on:keyup={delay(() => uriFilter = _uriFilter, 1500)} bind:value={_uriFilter}>
        </div>
    </div>

    <div class="uk-margin">
        <label class="uk-form-label" for="form-status">Status</label>
        <div class="uk-form-controls">
            <select class="uk-select" id="form-status" bind:value={statusFilter}>
                <option value={true}>Active</option>
                <option value={false}>Inactive</option>
                <option value={null}>Any</option>
            </select>
        </div>
    </div>

    <div class="uk-margin uk-column-1-2@m">
        <div>
            <label class="uk-form-label" for="form-sort-column">Sort by</label>
            <div class="uk-form-controls">
                <select class="uk-select" id="form-sort-column" bind:value={sortColumn}>
                    <option value="uri">URI</option>
                    <option value="status">Status</option>
                    <option value="lastCheck">Last check</option>
                    <option value="statusSince">Status since</option>
                </select>
            </div>
        </div>
        <div class="uk-margin-top">
            <label class="uk-form-label" for="form-sort-direction">Direction</label>
            <div class="uk-form-controls">
                <select class="uk-select" id="form-sort-direction" bind:value={sortDirection}>
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                </select>
            </div>
        </div>
    </div>
</form>