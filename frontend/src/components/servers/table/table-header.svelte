<script lang="ts">
    import type { Sort } from '@/store/servers/servers-service';

    interface Props {
        sort: Sort,
        updateSort: (sort: Sort) => void,
        onAllServerSelected: (value: boolean) => void,
    }

    let { sort, updateSort, onAllServerSelected }: Props = $props();

    const toggleSort = (field: Sort['field']) => {
        const newOrder = sort.field === field && sort.order === 'desc' ? 'asc' : 'desc';
        updateSort({ field, order: newOrder });
    };

    const sortIndicator = (field: Sort['field']) => {
        if (sort.field !== field) return '';
        return sort.order === 'asc' ? ' ▲' : ' ▼';
    };
</script>

<thead>
    <tr>
        <th>
            <input class="pointer"
                type="checkbox"
                onchange={e => onAllServerSelected(e.target.checked)}
            />
        </th>
        <th>Labels</th>
        <th class="cursor" onclick={() => toggleSort('protocol')}>Type{sortIndicator('protocol')}</th>
        <th class="cursor" onclick={() => toggleSort('host')}>URI{sortIndicator('host')}</th>
        <th class="cursor" onclick={() => toggleSort('country')}>Location{sortIndicator('country')}</th>
        <th class="cursor" onclick={() => toggleSort('info_page_available')}>Info page{sortIndicator('info_page_available')}</th>
        <th class="cursor" onclick={() => toggleSort('status')}>Status{sortIndicator('status')}</th>
        <th>
            <span class="cursor" onclick={() => toggleSort('uptime7')}>7d{sortIndicator('uptime7')}</span>
            /
            <span class="cursor" onclick={() => toggleSort('uptime30')}>30d{sortIndicator('uptime30')}</span>
            /
            <span class="cursor" onclick={() => toggleSort('uptime90')}>90d{sortIndicator('uptime90')}</span>
        </th>
        <th class="cursor" onclick={() => toggleSort('last_check')}>Last Check{sortIndicator('last_check')}</th>
        <th>Details</th>
    </tr>
</thead>

<style>
    th.cursor, span.cursor {
        cursor: pointer;
        user-select: none;
    }
    th.cursor:hover, span.cursor:hover {
        color: #1e87f0;
    }
</style>
