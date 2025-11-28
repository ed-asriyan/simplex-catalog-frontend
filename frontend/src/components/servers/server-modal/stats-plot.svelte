<script lang="ts">
    import { serverStatusesStore } from '../../../store/server-statuses-store';
    import type { Server } from '../../../store/servers-store';
    import { getFlagEmoji } from '../../../utils';
    import TimelinePlot, { type Item } from '../../timeline-plot.svelte';

    interface Props {
        server: Server;
    }

    let { server }: Props = $props();

    let statuses = $derived(serverStatusesStore.getByIndex('serverUuid', server.uuid));

    let items: Item[] = $derived(
        $statuses.map(status => ({
            timestamp: status.createdAt,
            series: {
                "Is Online": {
                    color: status.status ? 'green' : 'red',
                    context: status.status ? getFlagEmoji(status.country) : "No",
                    tooltip: `Server is ${status.status ? "Online" : "Offline"} and detected in ${status.country}`
                },
                "Is Info Page Available": {
                    color: status.infoPageAvailable ? 'green' : 'red',
                    context:  status.infoPageAvailable ? "" : "",
                    tooltip: `Info page is ${status.infoPageAvailable ? "available" : "not available"}`
                }
            }
        }))
    );
</script>

<TimelinePlot {items} />
