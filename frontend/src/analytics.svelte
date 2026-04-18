<script lang="ts" module>
    export { Event, ClickEvent, track } from './analytics';
</script>

<script lang="ts">
    import { onMount } from 'svelte';
    import { analyticsMeasurementId, isProduction } from './settings';
    import { trackRaw } from './analytics';

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
