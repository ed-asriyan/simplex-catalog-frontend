<!-- <script lang="ts" module>
    export interface Country {
        code: string;
        color: string;
        text: string;
    }

    const worldMapUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
</script>

<script lang="ts">
    import * as d3 from 'd3';
    import * as topojson from 'topojson-client';
    import * as i18IsoCountries from 'i18n-iso-countries';

    interface Props {
        countries: Country[];
    }

    let { countries }: Props = $props();

    let countriesMap = $derived(countries.reduce((acc, curr) => {
        acc[curr.code] = curr;
        return acc;
    }, {} as Record<string, Country>));

    const draw = function(element: SVGSVGElement, countriesMap: Record<string, Country>) {
        alert("Drawing map...");

        // 4. Setup SVG and map dimensions
        const width = 960;
        const height = 600;

        const svg = d3.select(element);
            // .attr("width", width)
            // .attr("height", height);

        // Select the tooltip div
        // const tooltip = d3.select(tooltipElement);

        // 5. Define map projection and path generator
        const projection = d3.geoMercator()
            .scale(150) // Adjust zoom level
            .translate([width / 2, height / 1.5]); // Center the map

        const path = d3.geoPath().projection(projection);

        d3.json(worldMapUrl).then(worldData => {
            // Convert TopoJSON to GeoJSON features
            const countries = topojson.feature(worldData, worldData.objects.countries);

            // Draw each country
            svg.selectAll("path")
                .data(countries.features)
                .enter().append("path")
                .attr("class", "country")
                .attr("d", path) // 'd' attribute defines the shape
                .attr("fill", d => {
                    const alpha2Code = d?.id && i18IsoCountries.numericToAlpha2(d.id) || "";
                    return countriesMap[alpha2Code]?.color || "white"; // Default color
                })
                .on("mouseover", (event, d) => {
                    // // 1. Get numeric ID
                    // const numericId = d.id;
                    // // 2. Convert to alpha-2
                    // const alpha2Code = countriesMapping.numericToAlpha2(numericId);
                    // // 3. Look up the text
                    // const text = alpha2Code ? textMap.get(alpha2Code) : "";
                    
                    // if (text) {
                        // If text exists, show and position the tooltip
                        // tooltip.style("opacity", 1)
                        //        .html(text)
                        //        .style("left", (event.pageX + 10) + "px")
                        //        .style("top", (event.pageY - 28) + "px");
                    // }
                })
                .on("mousemove", (event) => {
                    // Update tooltip position on mouse move
                    // tooltip.style("left", (event.pageX + 10) + "px")
                    //        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", () => {
                    // Hide the tooltip on mouse out
                    // tooltip.style("opacity", 0);
                });

        }).catch(error => {
            // Handle potential error loading the map data
            console.error("Error loading map data:", error);
            svg.append("text")
               .attr("x", width / 2)
               .attr("y", height / 2)
               .attr("text-anchor", "middle")
               .text("Error loading map data.");
        });
    };
</script> -->

<script lang="ts" module>
    export interface Country {
        code: string;
        color: string;
        text: string;
    }

    const worldMapUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
</script>

<script lang="ts">
    import * as d3 from 'd3';
    import * as topojson from 'topojson-client';
    import * as i18IsoCountries from 'i18n-iso-countries';
    import { onMount } from 'svelte';
    import LineCountry from './servers/fields/line-country.svelte';

    interface Props {
        countries: Country[];
    }

    let { countries }: Props = $props();
    let svgElement: SVGSVGElement;

    interface Tooltip {
        country: string;
        top: number;
        left: number;
        text: string;
    }
    let toolTip: Tooltip | null = $state(null);

    let countriesMap = $derived(countries.reduce((acc, curr) => {
        acc[curr.code] = curr;
        return acc;
    }, {} as Record<string, Country>));

    const width = 960;
    const height = 600;

    onMount(() => {
        const svg = d3.select(svgElement);

        const projection = d3.geoMercator()
            .scale(150)
            .translate([width / 2, height / 1.5]);

        const path = d3.geoPath().projection(projection);

        d3.json(worldMapUrl).then(worldData => {
            const countries = topojson.feature(worldData, worldData.objects.countries);

            svg.selectAll("path")
                .data(countries.features)
                .enter().append("path")
                .attr("class", "country")
                .attr("d", path);

        }).catch(error => {
            console.error("Error loading map data:", error);
            svg.append("text")
               .attr("x", width / 2)
               .attr("y", height / 2)
               .attr("text-anchor", "middle")
               .text("Error loading map data.");
        });
    });

    $effect(() => {
        if (!svgElement || !countriesMap) return;

        d3.select(svgElement)
            .selectAll(".country")
            .attr("fill", d => {
                const alpha2Code = d?.id && i18IsoCountries.numericToAlpha2(d.id) || "";
                return countriesMap[alpha2Code]?.color || "#FFFFFF07";
            })
            .on("mouseover", (event, d) => {
                const alpha2Code = d?.id && i18IsoCountries.numericToAlpha2(d.id) || "";
                const text = countriesMap[alpha2Code]?.text;
                
                if (text) {
                    toolTip = {
                        country: countriesMap[alpha2Code].code,
                        top: (event.pageY - 28) as number,
                        left: (event.pageX + 10) as number,
                        text,
                    };
                }
            })
            .on("mousemove", (event) => {
                toolTip = toolTip && {
                    ...toolTip,
                    top: (event.pageY - 28) as number,
                    left: (event.pageX + 10) as number,
                };
            })
            .on("mouseout", () => {
                toolTip = null;
            });
    });
</script>

<svg bind:this={svgElement} viewBox={`0 0 ${width} ${height}`}></svg>
{#if toolTip}
    <div class="tooltips" style={`top: ${toolTip.top}px; left: ${toolTip.left}px;`}>
        <b><LineCountry country={toolTip.country} /></b>
        <div class="uk-text">{toolTip.text}</div>
    </div>
{/if}

<style lang="scss">
    svg {
        width: 100%;
        height: auto;
    }

    .tooltips {
        position: absolute;
        background-color: rgba(0, 0, 0, 0.8);
        color: #fff;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 14px;
        pointer-events: none; /* Prevents tooltip from blocking mouse events */
        transition: opacity 0.2s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        white-space: nowrap;
        z-index: 1000;
    }
</style>
