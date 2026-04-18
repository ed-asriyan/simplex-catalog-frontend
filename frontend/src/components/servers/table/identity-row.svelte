<script lang='ts'>
    import type { Server } from '@/store/servers/servers-store';
    import { goto } from '@mateothegreat/svelte5-router';
    import LineCountry from '../fields/line-country.svelte';
    import LineDate from '../fields/line-date.svelte';

    export interface IdentityGroup {
        identity: string;
        servers: Server[];
    }

    interface Props {
        group: IdentityGroup;
    }

    let { group }: Props = $props();

    const MAX_IDENTITY_LENGTH = 20;

    let protocols = $derived([...new Set(group.servers.map(s => s.protocol))]);
    let countries = $derived([...new Set(group.servers.map(s => s.country).filter(Boolean))]);
    let activeCount = $derived(group.servers.filter(s => s.status).length);
    let latestCheck = $derived(
        group.servers.reduce((latest, s) => (!latest || s.lastCheck > latest) ? s.lastCheck : latest, '')
    );
    let identityShort = $derived(
        group.identity.length > MAX_IDENTITY_LENGTH
            ? group.identity.slice(0, MAX_IDENTITY_LENGTH) + '…'
            : group.identity
    );

    const navigate = () => {
        goto(`/#/servers/identity/${encodeURIComponent(group.identity)}`);
    };
</script>

<tr class='uk-text-small cursor' onclick={navigate}>
    <td>
        {#each protocols as protocol}
            <span
                class='uk-label'
                class:uk-label-default={protocol === 'smp'}
                class:uk-label-warning={protocol === 'xftp'}
            >
                {protocol.toUpperCase()}
            </span>
        {/each}
    </td>
    <td>
        <code uk-tooltip={group.identity}>{identityShort}</code>
    </td>
    <td class="uk-text-center">
        {group.servers.length}
    </td>
    <td>
        {#each countries.slice(0, 5) as country}
            <LineCountry {country} largeFlag={false} />
        {/each}
        {#if countries.length > 5}
            <span class="uk-text-muted">+{countries.length - 5}</span>
        {/if}
    </td>
    <td>
        <span class:uk-text-success={activeCount === group.servers.length} class:uk-text-danger={activeCount === 0}>
            {activeCount}
        </span>
        <span class="uk-text-muted">/ {group.servers.length}</span>
    </td>
    <td>
        {#if latestCheck}
            <LineDate date={latestCheck} />
        {/if}
    </td>
    <td>
        <button class='uk-button uk-button-secondary uk-button-small' onclick={(e) => { e.stopPropagation(); navigate(); }}>
            Details →
        </button>
    </td>
</tr>

<style>
    tr.cursor {
        cursor: pointer;
    }
    tr.cursor:hover {
        background-color: rgba(0, 0, 0, 0.03);
    }
</style>
