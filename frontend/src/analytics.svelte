<script lang="ts" context="module">
    import { analyticsMeasurementId, isProduction } from './settings';

    const trackRaw = function (...args: any[]) {
        if (isProduction) {
            // @ts-ignore
            analyticsMeasurementId && window.dataLayer.push(arguments);
        } else {
            console.log('Google Analytics:', ...args);
        }
    };

    abstract class Event<T> {
        abstract readonly name: string;
        readonly params: T;

        constructor(params: T) {
            this.params = params;
        }
    };

    export class ClickEvent extends Event<{
        target: string;
    }> {
        readonly name: string = 'click';
    }

    export const track = function<T> (event: Event<T>) {
        trackRaw('event', event.name, event.params);
    };
</script>

<script lang="ts">
    import { onMount } from 'svelte';

    onMount(() => {
        // @ts-ignore
        window.dataLayer = window.dataLayer || [];

        trackRaw('js', new Date());
        trackRaw('config', analyticsMeasurementId);
    });
</script>

<svelte:head>
    {#if isProduction && analyticsMeasurementId}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${analyticsMeasurementId}`}></script>
    {/if}
</svelte:head>
