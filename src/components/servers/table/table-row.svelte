<script lang='ts'>
    import type { Server } from '@/store/servers/servers-store';
    import { goto } from '@mateothegreat/svelte5-router';
    import LineCountry from '../fields/line-country.svelte';
    import LineDate from '../fields/line-date.svelte';
    import LineServerInfo from '../fields/line-server-info.svelte';
    import LineProtocol from '../fields/line-protocol.svelte';
    import LineUri from '../fields/line-uri.svelte';
    import Labels from '../labels.svelte';
    import Uptime from '@/components/uptime.svelte';
    import StatusBadge from '@/components/status-badge.svelte';

    interface Props {
        server: Server;
        selected: boolean;
        onSelect?: () => {};
    }

    let { server, selected, onSelect }: Props = $props();

    const navigateToServer = () => {
        goto(`/#/servers/${encodeURIComponent(server.uuid)}`);
    };
</script>

<tr class='uk-text-small cursor' class:uk-text-danger={!server.status} onclick={navigateToServer}>
    <td onclick={(e) => e.stopPropagation()}>
        <input type='checkbox' checked={selected} onclick={onSelect} />
    </td>
    <td onclick={(e) => e.stopPropagation()}>
        <Labels uuid={server.uuid} />
    </td>
    <td>
        <LineProtocol protocol={server.protocol} />
    </td>
    <td>
        <span onclick={(e) => e.stopPropagation()}>
            <LineUri {server} />
        </span>
    </td>
    <td>
        <LineCountry country={server.country} />
    </td>
    <td onclick={(e) => e.stopPropagation()}>
        <LineServerInfo {server} icon={true} />
    </td>
    <td>
        <StatusBadge status={server.status} />
    </td>
    <td>
        <Uptime {server} style="inline" />
    </td>
    <td>
        <LineDate date={server.lastCheck} />
    </td>
    <td>
        <LineDate date={server.createdAt} />
    </td>
    <td>
        <button class='uk-button uk-button-secondary uk-button-small' onclick={(e) => { e.stopPropagation(); navigateToServer(); }}>Details</button>
    </td>
</tr>

<style>
    tr.cursor {
        cursor: pointer;
    }
</style>
