<script lang="ts">
    import { Router, type RouteConfig } from "@mateothegreat/svelte5-router";
    import List from './list.svelte';
    import IdentityPage from './identity-page/index.svelte';

    const routes: RouteConfig[] = [
        {
            path: "servers",
            component: List,
        },
        {
            path: /servers\/identity\/(?<identity>[^?]*)/,
            component: IdentityPage,
        }
    ];
</script>

<Router routes={routes} />
