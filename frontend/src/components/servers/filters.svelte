<script lang="ts">
    import { camelToSnakeCase, delay } from '../../utils';
    import type { FetchParams, Column } from '../../database';
  import { get } from 'svelte/store';
  import { flagStore } from './flagged';

    export let params: FetchParams;

    $: params = {
        limit: 0,
        offset: 0,
        filters: function (q: any) {
            if (this[typeFilterSymbol]) {
                q.like('uri', this[typeFilterSymbol] === 'smp' ? 'smp://%' : 'xftp://%')
            }
            if (this[uriFilterSymbol]) {
                q.like('uri', this[uriFilterSymbol]);
            }
            if (this[statusFilterSymbol] !== null) {
                q.eq('status', this[statusFilterSymbol]);
            }
            if (this[flagedFilterSymbol] !== 'any') {
                const filter = this[flagedFilterSymbol] === 'flagged' ? 'eq' : 'neq';
                for (const uri of get(flagStore)) {
                    q[filter]('uri', uri);
                }
            }
            return q;
        },
        modifyers: function (q: any) {
            if (this[sortColumnSymbol]) {
                q.order(camelToSnakeCase(this[sortColumnSymbol]), { ascending: this[sortDirectionSymbol] === 'asc' });
            }
            return q;
        },
        [typeFilterSymbol]: typeFilter,
        [uriFilterSymbol]: uriFilter,
        [statusFilterSymbol]: statusFilter,
        [flagedFilterSymbol]: flagedFilter,
        [sortColumnSymbol]: sortColumn,
        [sortDirectionSymbol]: sortDirection,
    };

    const typeFilterSymbol = Symbol();
    let typeFilter: 'smp' | 'xftp' = 'smp';

    const uriFilterSymbol = Symbol();
    let uriFilter: string = '';

    const statusFilterSymbol = Symbol();
    let statusFilter: boolean | null = true;

    const flagedFilterSymbol = Symbol();
    let flagedFilter: 'any' | 'unflaged' | 'flagged';

    const sortColumnSymbol = Symbol();
    let sortColumn: Column | null = 'lastCheck';

    const sortDirectionSymbol = Symbol();
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

    <div class="uk-margin">
        <label class="uk-form-label" for="form-flag">Flag</label>
        <div class="uk-form-controls">
            <select class="uk-select" id="form-flag" bind:value={flagedFilter}>
                <option value={'any'}>All</option>
                <option value={'flagged'}>Show flagged only</option>
                <option value={'unflagged'}>Show unflagged only</option>
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
