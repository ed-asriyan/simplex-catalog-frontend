<script lang="ts">
    import UIkit from 'uikit/dist/js/uikit';
    import Analytics from './analytics.svelte';
    import Page from './components/index.svelte';
    import { environment, isProduction } from './settings';
    import type { InboundPorts } from './ports';
    import { provideWebsite } from './store/website';
    import './app.scss';

    interface Props {
        ports: InboundPorts;
    }

    let { ports }: Props = $props();

    // The ports are made once, before the website is mounted, and never change.
    // svelte-ignore state_referenced_locally
    provideWebsite(ports);

    // bundlers don't expose UIkit as a browser global, but its components rely on it
    window.UIkit = UIkit;
</script>

<Analytics/>

{#if !isProduction}
    <span class="uk-position-fixed uk-text-warning" style:top="0" style:left="0" style:z-index="1000">
        Running in non-production environment: environment="{ environment }", isProd={ isProduction }
    </span>
{/if}

<Page />
