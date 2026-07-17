<script lang="ts">
    import { Router, type RouteConfig } from "@mateothegreat/svelte5-router";
    import List from './list.svelte';
    import RelayPage from './relay-page.svelte';

    const routes: RouteConfig[] = [
        {
            path: "relays",
            component: List,
        },
        {
            path: /relays\/(?<uuid>.*)/,
            component: RelayPage,
        }
    ];
</script>

<Router routes={routes} />
