<script lang="ts">
    import 'uikit/dist/js/uikit';
    import Analytics from './analytics.svelte';
    import Page from './components/index.svelte';
    import { environment, isProduction } from './settings';
    import './app.scss';
</script>

<Analytics/>

{#if !isProduction}
    <span class="uk-position-fixed uk-text-warning" style:top="0" style:left="0" style:z-index="1000">
        Running in non-production environment: environment="{ environment }", isProd={ isProduction }
    </span>
{/if}

<Page />
