<script lang='ts'>
    import type { Server } from '../../../store/servers-store';
    import ServerModal from '../server-modal/index.svelte';
    import LineCountry from '../fields/line-country.svelte';
    import LineDate from '../fields/line-date.svelte';
    import LineServerInfo from '../fields/line-server-info.svelte';
    import LineStatus from '../fields/line-status.svelte';
    import LineUri from '../fields/line-uri.svelte';
    import Labels from '../labels.svelte';
    import Uptime from '../../uptime.svelte';

    interface Props {
        server: Server;
        selected: boolean;
        onSelect?: () => {};
    }

    let { server, selected, onSelect }: Props = $props();

    let selectedServers: Server[] = $state([]);
</script>

<ServerModal bind:servers={selectedServers} />

<tr class='uk-text-small' class:uk-text-danger={!server.status}>
    <td>
        <input type='checkbox' checked={selected} onclick={onSelect} />
    </td>
    <td>
        <Labels uuid={server.uuid} />
    </td>
    <td>
        <span
            class='uk-label'
            class:uk-label-default={server.protocol === 'smp'}
            class:uk-label-warning={server.protocol === 'xftp'}
        >
            {server.protocol.toUpperCase()}
        </span>
    </td>
    <td>
        <LineUri server={server} />
    </td>
    <td>
        <LineCountry country={server.country} />
    </td>
    <td>
        <LineServerInfo server={server} icon={true} />
    </td>
    <td>
        <LineStatus status={server.status} />
    </td>
    <td>
        <Uptime server={server} style="inline" />
    </td>
    <td>
        <LineDate date={server.lastCheck} />
    </td>
    <td>
        <button class='uk-button uk-button-secondary uk-button-small' onclick={() => selectedServers = [server]}>QR & stats</button>
    </td>
</tr>
