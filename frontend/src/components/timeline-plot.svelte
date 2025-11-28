<script module lang="ts">
    export type Color = 'green' | 'red';

    export interface TimelineItem {
        color: Color;
        context: string;
        tooltip?: string;
    }

    export interface Item {
        timestamp: Date;
        series: {[s: string]: TimelineItem}[];
    }
</script>

<script lang="ts">
    const colorMap: Record<Color, string> = {
        green: "#32d296",
        red: "#f0506e"
    }

    interface Props {
        items: Item[];
    }
    let { items }: Props = $props();

    let itemsSorted: Item[] = $derived(items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));
    let seriesNames: string[] = $derived(Object.keys(items[0]?.series || {}));

    let itemsWithDifferencesOnly = $derived(
        itemsSorted.reduce<Item[]>((acc, curr, idx) => {
            if (idx === 0) {
                acc.push(curr);
                return acc;
            }
            const prev = acc[acc.length - 1];

            const differs = seriesNames.some((name) => {
                const a = prev.series[name];
                const b = curr.series[name];
                return (a?.color !== b?.color) || (a?.context !== b?.context) || (a?.tooltip !== b?.tooltip);
            });

            if (differs) acc.push(curr);
            return acc;
        }, [])
    );
</script>

{#if items.length === 0}
    <p>No data available</p>
{:else}
    <div class="uk-overflow-auto">
        <table class="uk-table uk-table-small uk-table-divider uk-text-small">
            <thead class="timeline-row">
                <tr>
                    <th class="timeline-sticky" style="position:sticky;left:0;z-index:3;background:#fff;">
                        Starting from
                    </th>
                    {#each itemsWithDifferencesOnly as item}
                        <th class="timeline-timestamp timeline-cell">
                            {item.timestamp.getFullYear()}
                            {item.timestamp.toLocaleString('en-US', { month: 'short' })}
                            {item.timestamp.getDate()}
                        </th>
                    {/each}
                </tr>
            </thead>
            <tbody>
                {#each seriesNames as seriesName}
                    <tr class="timeline-row">
                        <td class="timeline-sticky" style="position:sticky;left:0;z-index:2;background:#fff;">
                            {seriesName}
                        </td>
                        {#each itemsWithDifferencesOnly as item}
                            <td
                                class="timeline-cell"
                                style:background-color={colorMap[item.series[seriesName]?.color]}
                                uk-tooltip={item.series[seriesName]?.tooltip}
                            >
                                {item.series[seriesName]?.context}
                            </td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
{/if}

