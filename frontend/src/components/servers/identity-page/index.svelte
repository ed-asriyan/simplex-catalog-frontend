<script lang="ts">
    import QRCode from '@castlenine/svelte-qrcode';
    import { serversService } from '@/store/servers/servers-service';
    import { serversStore, type Server } from '@/store/servers/servers-store';
    import { serverStatusesService } from '@/store/servers/statuses-service';
    import { serverStatusesStore } from '@/store/servers/statuses-store';
    import { getFlagEmoji } from '@/utils';
    import LineCountry from '../fields/line-country.svelte';
    import LineProtocol from '../fields/line-protocol.svelte';
    import LineStatus from '../fields/line-status.svelte';
    import LineServerInfo from '../fields/line-server-info.svelte';
    import LineDate from '../fields/line-date.svelte';
    import Uptime from '@/components/uptime.svelte';
    import Labels from '../labels.svelte';
    import TimelinePlot from '@/components/timeline-plot.svelte';
    import type { Item } from '@/components/timeline-plot.svelte';
    import LineUri from '../fields/line-uri.svelte';
    import ServerQrCode from '../fields/server-qrcode.svelte';

    interface Props {
        route: any;
    }

    let { route }: Props = $props();
    let identityEncoded = $derived(route.result.path.params?.identity || '');
    let identity: string = $derived(decodeURIComponent(identityEncoded));

    let servers: Server[] = $state([]);
    let selectedUuids: Set<string> = $state(new Set());
    let statusesFetched = $state(false);

    let loadingPromise: Promise<void> = $derived(
        identity
            ? serversService.fetch(
                { identityExact: identity, labels: undefined },
                { field: 'status', order: 'desc' },
                1000,
                1
            ).then(uuids => {
                const fetched = uuids.map(uuid => serversStore.getBy("uuid", uuid).get()).filter(Boolean) as Server[];
                servers = fetched;
                selectedUuids = new Set(fetched.map(s => s.uuid));
                if (fetched.length > 0) {
                    statusesFetched = false;
                    serverStatusesService.fetch(fetched.map(s => s.uuid)).then(() => {
                        statusesFetched = true;
                    });
                }
            })
            : Promise.resolve()
    );

    let selectedServers: Server[] = $derived(
        servers.filter(s => selectedUuids.has(s.uuid))
    );

    const toggleServer = (uuid: string) => {
        const next = new Set(selectedUuids);
        if (next.has(uuid)) {
            next.delete(uuid);
        } else {
            next.add(uuid);
        }
        selectedUuids = next;
    };

    const MAX_IDENTITY_DISPLAY = 24;
    let identityShort = $derived(
        identity.length > MAX_IDENTITY_DISPLAY
            ? identity.slice(0, MAX_IDENTITY_DISPLAY) + '…'
            : identity
    );

    const MAX_HOST_LENGTH = 30;
    const truncateHost = (host: string) =>
        host.length > MAX_HOST_LENGTH ? '…' + host.slice(host.length - MAX_HOST_LENGTH) : host;

    const getTimelineItems = function (server: Server) {
        const statuses = serverStatusesStore.getByIndex('serverUuid', server.uuid);
        return statuses.get().map(status => ({
            timestamp: status.createdAt,
            series: {
                "Status": {
                    color: status.status ? 'green' : 'red',
                    context: status.status ? `Online ${getFlagEmoji(status.country)}` : "Offline",
                    tooltip: `Server is ${status.status ? "Online" : "Offline"} and detected in ${status.country}`
                },
                "Is Info Page": {
                    color: status.infoPageAvailable ? 'green' : 'red',
                    context: status.infoPageAvailable ? "Available" : "Not Available",
                    tooltip: `Info page is ${status.infoPageAvailable ? "available" : "not available"}`
                }
            }
        }) as unknown as Item);
    };
</script>

<div class="uk-section uk-section-muted">
    <div class="uk-container">
        {#await loadingPromise}
            <div class="uk-text-center uk-margin-large-top">
                <span data-uk-spinner="ratio: 3"></span>
            </div>
        {:then}
            {#if servers.length === 0}
                <div class="uk-alert-warning" data-uk-alert>
                    <p>No servers found for this identity.</p>
                </div>
            {:else}
                <div class="uk-card uk-card-default uk-card-body">
                    <h2 class="uk-card-title uk-margin-remove-bottom">
                        Identity <code uk-tooltip={identity}>{identity}</code>
                    </h2>

                    <hr />

                    <!-- Servers table + QR side by side -->
                    <div class="uk-grid-small" uk-grid>
                        <div class="uk-width-1-4@m">
                            <ServerQrCode servers={selectedServers} />
                        </div>
                        <div class="uk-width-3-4@m">
                            <h4>
                                Servers with this identity ({servers.length})
                            </h4>
                            <div class="uk-overflow-auto">
                                <table class="uk-table uk-table-small uk-table-divider uk-table-hover uk-table-middle">
                                    <thead>
                                        <tr>
                                            <th class="uk-table-shrink"></th>
                                            <th>Host</th>
                                            <th>Location</th>
                                            <th>Status</th>
                                            <th>Uptime</th>
                                            <th>Info</th>
                                            <th>Last Check</th>
                                            <th>Labels</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#each servers as server (server.uuid)}
                                            <tr class="uk-text-small" class:uk-text-danger={!server.status}>
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedUuids.has(server.uuid)}
                                                        onchange={() => toggleServer(server.uuid)}
                                                    />
                                                </td>
                                                <td>
                                                    <LineUri servers={[server]} maxLength={16} />
                                                </td>
                                                <td><LineCountry country={server.country} largeFlag={false} /></td>
                                                <td><LineStatus status={server.status} /></td>
                                                <td><Uptime servers={[server]} style="inline" /></td>
                                                <td><LineServerInfo {server} icon={true} /></td>
                                                <td><LineDate date={server.lastCheck} /></td>
                                                <td><Labels uuid={server.uuid} /></td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <hr />

                    <!-- Availability timelines -->
                    <h4>Availability History</h4>
                    {#if statusesFetched}
                        {#each servers as server (server.uuid)}
                            {@const items = getTimelineItems(server)}
                            <div class="uk-margin-medium-bottom">
                                <h5 class="uk-margin-small-bottom">
                                    <span class="uk-margin-small-right"><LineProtocol protocol={server.protocol} /></span>
                                    <LineUri servers={[server]} maxLength={30} />
                                    <span class="uk-margin-small-left">
                                        <LineCountry country={server.country} largeFlag={false} />
                                    </span>
                                </h5>
                                {#if items.length > 0}
                                    <TimelinePlot {items} />
                                {:else}
                                    <p class="uk-text-muted uk-text-small">No availability data yet.</p>
                                {/if}
                            </div>
                        {/each}
                    {:else}
                        <div class="uk-text-center uk-margin-top">
                            <span data-uk-spinner="ratio: 2"></span>
                            <p class="uk-text-muted">Loading availability history…</p>
                        </div>
                    {/if}
                </div>
            {/if}
        {:catch error}
            <div class="uk-alert-danger" data-uk-alert>
                <p>{error}</p>
            </div>
        {/await}
    </div>
</div>

<style>
    .uri-box {
        word-break: break-all;
        padding: 0.5em;
        background: #f8f8f8;
        border-radius: 4px;
    }
</style>
