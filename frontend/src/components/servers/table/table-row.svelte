<script lang='ts'>
    import type { Server } from '@/store/servers/servers-store';
    import { goto } from '@mateothegreat/svelte5-router';
    import LineCountry from '../fields/line-country.svelte';
    import LineDate from '../fields/line-date.svelte';
    import LineServerInfo from '../fields/line-server-info.svelte';
    import LineProtocol from '../fields/line-protocol.svelte';
    import LineStatus from '@/components/status-badge.svelte';
    import LineUri from '../fields/line-uri.svelte';
    import Labels from '../labels.svelte';
    import Uptime from '@/components/uptime.svelte';
  import StatusBadge from '@/components/status-badge.svelte';

    interface Props {
        servers: Server[];
        selected: boolean;
        onSelect?: () => {};
    }

    let { servers, selected, onSelect }: Props = $props();

    let identity = $derived(servers[0]?.identity || '');

    // Deduplicated protocols
    let uniqueProtocols = $derived(
        [...new Set(servers.map(s => s.protocol))] as ('smp' | 'xftp')[]
    );

    // Deduplicated countries
    let uniqueCountries = $derived(
        [...new Set(servers.map(s => s.country))].filter(Boolean)
    );

    // Latest last check
    let latestLastCheck = $derived(
        servers.reduce((latest, s) => (!latest || s.lastCheck > latest) ? s.lastCheck : latest, '')
    );

    const navigateToIdentity = () => {
        goto(`/#/servers/identity/${encodeURIComponent(identity)}`);
    };
</script>

<tr class='uk-text-small cursor' class:uk-text-danger={servers.some(s => !s.status)} onclick={navigateToIdentity}>
    <td onclick={(e) => e.stopPropagation()}>
        <input type='checkbox' checked={selected} onclick={onSelect} />
    </td>
    <td onclick={(e) => e.stopPropagation()}>
        <Labels uuids={servers.map(s => s.uuid)} />
    </td>
    <td>
        {#each uniqueProtocols as protocol (protocol)}
            <div><LineProtocol {protocol} /></div>
        {/each}
    </td>
    <td>
        <span onclick={(e) => e.stopPropagation()}>
            <LineUri {servers} />
        </span>
    </td>
    <td>
        {#each uniqueCountries as country (country)}
            <div><LineCountry {country} /></div>
        {/each}
    </td>
    <td>
        {#each servers as server (server.uuid)}
            <div onclick={(e) => e.stopPropagation()}><LineServerInfo {server} icon={true} /></div>
        {/each}
    </td>
    <td>
        <StatusBadge items={servers} />
    </td>
    <td>
        <Uptime {servers} style="inline" />
    </td>
    <td>
        <LineDate date={latestLastCheck} />
    </td>
    <td>
        <button class='uk-button uk-button-secondary uk-button-small' onclick={(e) => { e.stopPropagation(); navigateToIdentity(); }}>Details</button>
    </td>
</tr>

<style>
    tr.cursor {
        cursor: pointer;
    }
</style>
