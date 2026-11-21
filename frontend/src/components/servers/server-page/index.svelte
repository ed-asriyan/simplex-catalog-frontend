<script lang="ts">
    import { serversService } from '@/store/servers/servers-service';
    import { serversStore, type Server } from '@/store/servers/servers-store';
    import { serverStatusesService } from '@/store/servers/statuses-service';
    import { serverStatusesStore } from '@/store/servers/statuses-store';
    import { getFlagEmoji } from '@/utils';
    import LineCountry from '../fields/line-country.svelte';
    import LineProtocol from '../fields/line-protocol.svelte';
    import LineServerInfo from '../fields/line-server-info.svelte';
    import LineDate from '../fields/line-date.svelte';
    import Uptime from '@/components/uptime.svelte';
    import Labels from '../labels.svelte';
    import TimelinePlot from '@/components/timeline-plot.svelte';
    import type { Item } from '@/components/timeline-plot.svelte';
    import LineUri from '../fields/line-uri.svelte';
    import ServerQrCode from '../fields/server-qrcode.svelte';
    import StatusBadge from '@/components/status-badge.svelte';

    interface Props {
        route: any;
    }

    let { route }: Props = $props();
    let uuidEncoded = $derived(route.result.path.params?.uuid || '');
    let uuid: string = $derived(decodeURIComponent(uuidEncoded));

    let server: Server | null = $state(null);
    let statusesFetched = $state(false);
    let siblingCount: number = $state(0);

    let loadingPromise: Promise<void> = $derived(
        uuid
            ? serversService.fetch(
                { uuid, labels: undefined },
                { field: 'status', order: 'desc' },
                1,
                1
            ).then(async uuids => {
                const found = uuids.map(id => serversStore.getBy("uuid", id).get()).filter(Boolean)[0] as Server | undefined;
                server = found || null;
                if (server) {
                    statusesFetched = false;
                    const [, count] = await Promise.all([
                        serverStatusesService.fetch([server.uuid]).then(() => { statusesFetched = true; }),
                        serversService.countByIdentity(server.identity, server.uuid),
                    ]);
                    siblingCount = count;
                }
            })
            : Promise.resolve()
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
            {#if !server}
                <div class="uk-alert-warning" data-uk-alert>
                    <p>Server not found.</p>
                </div>
            {:else}
                <div class="uk-card uk-card-default uk-card-body">
                    <h2 class="uk-card-title uk-margin-remove-bottom">
                        <LineProtocol protocol={server.protocol} />
                        <span uk-tooltip={server.host}>{truncateHost(server.host)}</span>
                    </h2>
                    <div class="uk-text-muted uk-text-small uk-margin-small-top">
                        Identity <code uk-tooltip={server.identity}>{server.identity}</code>
                    </div>

                    {#if siblingCount > 0}
                        <div class="uk-margin-small-top">
                            <a href={`/#/servers?filterIdentity=${encodeURIComponent(server.identity)}`}>
                                There {siblingCount === 1 ? 'is' : 'are'} {siblingCount} more server{siblingCount === 1 ? '' : 's'} with this identity →
                            </a>
                        </div>
                    {/if}

                    <hr />

                    <div class="uk-grid-small" uk-grid>
                        <div class="uk-width-1-4@m">
                            <ServerQrCode {server} />
                        </div>
                        <div class="uk-width-3-4@m">
                            <table class="uk-table uk-table-small uk-table-divider uk-table-middle">
                                <tbody>
                                    <tr>
                                        <td>Location</td>
                                        <td><LineCountry country={server.country} /></td>
                                    </tr>
                                    <tr>
                                        <td>Status</td>
                                        <td><StatusBadge status={server.status} /></td>
                                    </tr>
                                    <tr>
                                        <td>Uptime</td>
                                        <td><Uptime {server} style="inline" /></td>
                                    </tr>
                                    <tr>
                                        <td>Info page</td>
                                        <td><LineServerInfo {server} icon={false} /></td>
                                    </tr>
                                    <tr>
                                        <td>Last check</td>
                                        <td><LineDate date={server.lastCheck} /></td>
                                    </tr>
                                    <tr>
                                        <td>Added at</td>
                                        <td><LineDate date={server.createdAt} /></td>
                                    </tr>
                                    <tr>
                                        <td>Labels</td>
                                        <td><Labels uuid={server.uuid} /></td>
                                    </tr>
                                    <tr>
                                        <td>URI</td>
                                        <td><LineUri {server} maxLength={40} /></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <hr />

                    <h4>Availability History</h4>
                    {#if statusesFetched}
                        {@const items = getTimelineItems(server)}
                        {#if items.length > 0}
                            <TimelinePlot {items} />
                        {:else}
                            <p class="uk-text-muted uk-text-small">No availability data yet.</p>
                        {/if}
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
