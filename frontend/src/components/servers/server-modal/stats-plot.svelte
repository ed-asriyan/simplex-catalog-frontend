<script lang="ts">
    import * as d3 from 'd3';
    import type { ServerStatus } from '../../../database';
    import { getFlagEmoji } from '../../../utils';
    import LineCountry from '../line-country.svelte';
    import LineStatus from '../line-status.svelte';

    interface Props {
        statuses: ServerStatus[];
    }

    let { statuses }: Props = $props();

    let outagesOnly: boolean = $state(true);

    let listView: ServerStatus[] = $derived(outagesOnly ? statuses.filter(status => !status.status) : statuses);

    const now = new Date();

    // Set up dimensions
    const width = 896;
    const height = 15;
    const margin = { top: 20, right: 0, bottom: 60, left: 0 };
    const lineSpacing = 0;  // Spacing between the availability and country lines
    const minLabelSpacing = 50;

    const draw = function(element: HTMLElement, data: ServerStatus[]) {
        // Define time scale
        const timeScale = d3.scaleTime()
            .domain([data[0].createdAt, now])
            .range([0, width]);

        // Append SVG element
        const svg = d3.select(element)
            // .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height * 2 + lineSpacing + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Draw the availability line (top line)
        for (let i = 0; i < statuses.length; i++) {
            const start = data[i].createdAt;
            const end = (i < data.length - 1) ? data[i + 1].createdAt : now;
            const status = data[i].status;

            svg.append("rect")
                .attr("x", timeScale(start))
                .attr("y", 0)
                .attr("width", timeScale(end) - timeScale(start))
                .attr("height", height)
                .attr("fill", status ? "#32d296" : "#f0506e");
        }

        // Draw the country line (bottom line)
        let lastLabelPosition = -Infinity;

        for (let i = 0; i < data.length; i++) {
            const start = data[i].createdAt;
            const end = (i < data.length - 1) ? data[i + 1].createdAt : now;
            const countries = data[i].countries;

            const segmentWidth = timeScale(end) - timeScale(start);
            const segmentCenter = timeScale(start) + segmentWidth / 2;

            // Draw countries segments
            svg.append("rect")
                .attr("class", "canvas")
                .attr("x", timeScale(start))
                .attr("y", height + lineSpacing)
                .attr("width", segmentWidth)
                .attr("height", height)
                .attr("fill", "lightgray");

            // Add ies label only if it doesn't overlap with the last label
            if (segmentCenter - lastLabelPosition > minLabelSpacing) {
                svg.append("text")
                    .attr("x", segmentCenter)
                    .attr("y", height + lineSpacing + height / 2)
                    .attr("dy", ".25em")
                    .attr("text-anchor", "middle")
                    .text(countries.map(country => getFlagEmoji(country)).join(''))
                    .style("fill", "black")
                    .style("font-size", "12px");

                // Update last label position to current segment's center
                lastLabelPosition = segmentCenter;
            }
        }

        // Add X-axis with date labels
        svg.append("g")
            .attr("transform", `translate(0, ${height * 2 + lineSpacing})`)
            .call(d3.axisBottom(timeScale)
                .ticks(d3.timeDay.every(5))  // Show ticks weekly
                .tickFormat(d3.timeFormat("%Y-%m-%d"))  // Format for date
            )
            .selectAll("text")
            .attr("transform", "rotate(-45)")  // Rotate labels for readability
            .style("text-anchor", "end");

        element.parentElement.scroll({ left: width });
    };
</script>

<div class="container">
    <svg class="plot" use:draw={statuses}></svg>
</div>

<div class="pointer">
    <input type="checkbox" bind:checked={outagesOnly}/>
    <span onclick={() => outagesOnly = !outagesOnly}>show outages only</span>
</div>

{#if listView.length === 0}
    {#if outagesOnly}
        <p>No outages 😎</p>
    {:else}
        <p>No data available</p>
    {/if}
{:else}
    <table class="uk-table uk-table-divider uk-table-hover uk-margin-remove-top uk-table-small">
        <thead>
            <tr>
                <th>Timestamp</th>
                <th>Status</th>
                <th>Country</th>
                <th>Info page</th>
            </tr>
        </thead>
        <tbody>
            {#each listView as status}
                <tr class="uk-text-left" class:uk-text-danger={!status.status} class:uk-text-success={status.status}>
                    <td>{status.createdAt.toLocaleString()}</td>
                    <td><LineStatus status={status.status} /></td>
                    <td>
                        {#each status.countries as country}
                            <LineCountry country={country} />
                        {/each}
                    <td>{status.infoPageAvailable ? 'Yes' : 'No'}</td>
                </tr>
            {/each}
        </tbody>
    </table>
{/if}
<style lang="scss">
    .container {
        overflow-x: scroll;
        padding-bottom: 1rem;

        & > .plot {
            max-width: fit-content !important;
        }
    }
</style>
