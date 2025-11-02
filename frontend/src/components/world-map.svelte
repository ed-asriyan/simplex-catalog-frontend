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
        onCountryClick?: (country: string) => void;
    }

    let { countries, onCountryClick }: Props = $props();
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

    const getAlpha2Code = function (id: string): string | undefined {
        return i18IsoCountries.numericToAlpha2(id);
    };

    $effect(() => {
        if (!svgElement || !countriesMap) return;

        d3.select(svgElement)
            .selectAll(".country")
            .attr("fill", d => {
                return countriesMap[getAlpha2Code(d?.id)]?.color || "#FFFFFF07";
            })
            .attr("stroke", d => {
                const alpha2Code = getAlpha2Code(d?.id);
                return countriesMap[alpha2Code]?.color ? "#FFFFFF1D" : null;
            })
            .attr("class", d => {
                const alpha2Code = getAlpha2Code(d?.id);
                return "country" + (countriesMap[alpha2Code] ? " cursor" : "");
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
            .on("click", (event, d) => {
                const alpha2Code = d?.id && i18IsoCountries.numericToAlpha2(d.id);
                const country = countriesMap[alpha2Code];
                if (country) {
                    onCountryClick && onCountryClick(country.code);
                }
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
