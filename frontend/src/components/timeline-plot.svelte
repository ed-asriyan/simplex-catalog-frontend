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
    import { convertUTCDateToLocalDate } from '@/utils';
    import { onMount, tick } from 'svelte';

    const colorMap: Record<Color, string> = {
        green: "#32d296",
        red: "#f0506e"
    }

    interface Props {
        items: Item[];
    }
    let { items }: Props = $props();

    let scrollEl: HTMLDivElement;

    onMount(async () => {
        await tick();
        if (scrollEl) {
            scrollEl.scrollLeft = scrollEl.scrollWidth;
        }
    });

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

    const formatDate = (date: Date) => {
        const local = convertUTCDateToLocalDate(date);
        return local.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const formatTime = (date: Date) => {
        const local = convertUTCDateToLocalDate(date);
        return local.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };
</script>

{#if items.length === 0}
    <p>No data available</p>
{:else}
    <div class="tl-wrapper">
        <div class="tl-header">
            <div class="tl-header-cell tl-corner"></div>
            {#each seriesNames as name}
                <div class="tl-header-cell uk-text-small uk-text-bold">{name}</div>
            {/each}
        </div>
        <div class="timeline-scroll" bind:this={scrollEl}>
            <div class="timeline">
                {#each itemsWithDifferencesOnly as item, idx}
                    {@const allGreen = seriesNames.every(n => item.series[n]?.color === 'green')}
                    {@const dotColor = allGreen ? colorMap.green : colorMap.red}
                    <div class="timeline-entry">
                        <div class="timeline-top">
                            <div class="timeline-line-container">
                                <span class="timeline-line" class:timeline-line-invisible={idx === 0}></span>
                                <span class="timeline-dot" style:background-color={dotColor}></span>
                                <span class="timeline-line" class:timeline-line-invisible={idx === itemsWithDifferencesOnly.length - 1}></span>
                            </div>
                        </div>
                        <div class="timeline-content">
                            <div class="timeline-date uk-text-meta">
                                {formatDate(item.timestamp)}
                                <br/>
                                {formatTime(item.timestamp)}
                            </div>
                            <div class="timeline-details uk-text-small">
                                {#each seriesNames as name}
                                    {@const entry = item.series[name]}
                                    {#if entry}
                                        <span
                                            class="timeline-badge"
                                            style:background-color="{colorMap[entry.color]}22"
                                            style:color={colorMap[entry.color]}
                                            style:border-color={colorMap[entry.color]}
                                            uk-tooltip={entry.tooltip || ''}
                                        >
                                            {entry.context}
                                        </span>
                                    {/if}
                                {/each}
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </div>
{/if}

<style>
    .tl-wrapper {
        display: flex;
        overflow: hidden;
    }

    .tl-header {
        flex-shrink: 0;
        position: sticky;
        left: 0;
        z-index: 2;
        background: #fff;
        display: flex;
        flex-direction: column;
        border-right: 1px solid #e5e5e5;
        padding-top: 20px;
    }

    .tl-header-cell {
        display: flex;
        align-items: center;
        padding: 2px 10px;
        white-space: nowrap;
        min-height: 22px;
    }

    .tl-corner {
        min-height: 42px;
    }

    .timeline-scroll {
        overflow-x: auto;
        flex: 1;
        padding-bottom: 4px;
    }

    .timeline {
        display: flex;
        align-items: flex-start;
        min-width: min-content;
    }

    .timeline-entry {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 100px;
        max-width: 160px;
        flex: 1 0 auto;
    }

    .timeline-top {
        width: 100%;
    }

    .timeline-line-container {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 20px;
    }

    .timeline-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .timeline-line {
        height: 2px;
        flex: 1;
        background: #e5e5e5;
    }

    .timeline-line-invisible {
        background: transparent;
    }

    .timeline-content {
        text-align: center;
        padding: 8px 6px 0;
        min-width: 0;
    }

    .timeline-date {
        font-weight: 500;
        margin-bottom: 4px;
        white-space: nowrap;
    }

    .timeline-details {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
    }

    .timeline-badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 4px;
        border: 1px solid;
        font-size: 0.8em;
        white-space: nowrap;
    }
</style>

