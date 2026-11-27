<script lang="ts">
    import type { Relay, RelayCheck } from '@/ports';
    import { useWebsite } from '@/store/website';
    import { readAll, valueOf } from '@/store/result';
    import { convertUTCDateToLocalDate } from '@/utils';
    import moment from 'moment';
    import CopyLink from '@/components/copy-link.svelte';
    import TimelinePlot, { type Color, type Item } from '@/components/timeline-plot.svelte';
    import QRCode from '@castlenine/svelte-qrcode';
    import StatusBadge from '@/components/status-badge.svelte';

    interface Props {
        route: any;
    }

    let { route }: Props = $props();
    let { uuid } = $derived(route.result.path.params || {});
    const { ports } = useWebsite();

    let relay: Relay | null = $state(null);
    let relayStatuses: RelayCheck[] = $state([]);

    let loadingPromise: Promise<any> = $derived(
        uuid ? Promise.all([
            ports.relays.relay(uuid).then(valueOf),
            readAll(page => ports.relays.checks([uuid], page)).then(valueOf),
        ]).then(([found, checks]) => {
            relay = found;
            relayStatuses = checks;
        }) : Promise.resolve()
    );

    let timelineItems: Item[] = $derived(
        relayStatuses.map(status => ({
            timestamp: status.createdAt,
            series: {
                "Is Online": {
                    color: (status.status ? 'green' : 'red') as Color,
                    context: status.status ? "Online" : "Offline",
                },
            }
        }) as Item)
    );
</script>

<div class="uk-section uk-section-muted">
    <div class="uk-container">
        {#await loadingPromise}
            <div class="uk-text-center uk-margin-large-top">
                <span data-uk-spinner="ratio: 3"></span>
            </div>
        {:then _}
            {#if relay}
                <div class="uk-card uk-card-default uk-card-body">
                    <div class="uk-grid-small uk-flex-middle" data-uk-grid>
                        <div class="uk-width-auto">
                            {#if relay.photo}
                                <img class="uk-border-circle" width="80" height="80" src={relay.photo} alt={relay.name}>
                            {:else}
                                <div class="uk-border-circle uk-background-muted uk-flex uk-flex-center uk-flex-middle" style="width: 80px; height: 80px; font-size: 40px;">
                                    🤖
                                </div>
                            {/if}
                        </div>
                        <div class="uk-width-expand">
                            <h3 class="uk-card-title uk-margin-remove-bottom uk-text-bold">
                                {relay.name}
                                &nbsp;
                                <StatusBadge status={relay.status} />
                            </h3>
                            <div class="uk-text-meta uk-margin-remove-top">
                                {#if relay.lastCheck}
                                    <div uk-tooltip={convertUTCDateToLocalDate(relay.lastCheck).toLocaleString()}>
                                        Last check: {moment(convertUTCDateToLocalDate(relay.lastCheck)).fromNow()}
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>

                    <div class="uk-margin-top" data-uk-grid>
                        <div class="uk-width-1-3@l uk-text-center">
                            {#if relay.url}
                                <QRCode data={relay.url} />
                            {/if}
                            <div class="uk-margin-small-top">
                                <CopyLink url={relay.url} maxLength={28} truncateDirection="end" />
                            </div>
                        </div>
                        <div class="uk-width-2-3@l">
                            <h4>Availability History</h4>
                            {#if timelineItems && timelineItems.length > 0}
                                <TimelinePlot items={timelineItems} />
                            {:else}
                                <p class="uk-text-muted uk-text-small">No availability data yet.</p>
                            {/if}
                        </div>
                    </div>
                    <p class="uk-text-small uk-text-muted">
                        <span uk-tooltip={convertUTCDateToLocalDate(relay.createdAt).toLocaleString()}>
                            Added to the catalog {moment(convertUTCDateToLocalDate(relay.createdAt)).fromNow()}
                        </span>
                    </p>
                </div>
            {:else}
                <div class="uk-alert-warning" data-uk-alert>
                    <p>Relay not found.</p>
                </div>
            {/if}
        {:catch error}
            <div class="uk-alert-danger" data-uk-alert>
                <p>{error}</p>
            </div>
        {/await}
    </div>
</div>
