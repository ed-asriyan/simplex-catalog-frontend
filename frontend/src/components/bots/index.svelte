<script lang="ts">
    import { Router, type RouteConfig } from "@mateothegreat/svelte5-router";
    import List from "./list.svelte";
    import BotPage from "./bot-page.svelte";

    const routes: RouteConfig[] = [
        {
            path: "bots",
            component: List,
        },
        {
            path: /bots\/(?<uuid>.*)/,
            component: BotPage,
        }
    ];
</script>

<Router routes={routes} />
