<script lang="ts">
    import { Router, type RouteConfig } from "@mateothegreat/svelte5-router";
    import List from './list.svelte';
    import ServerPage from './server-page/index.svelte';

    const routes: RouteConfig[] = [
        {
            path: "servers",
            component: List,
        },
        {
            path: /servers\/(?<uuid>[^?]*)/,
            component: ServerPage,
        }
    ];
</script>

<Router routes={routes} />
