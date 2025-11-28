<script lang="ts">
    import { goto, route, Router, type RouteConfig } from "@mateothegreat/svelte5-router";
    import GithubCorner from './github-corner.svelte';
    import Sponsors from './sponsors.svelte';
    import Servers from './servers/index.svelte';
    import Bots from './bots/index.svelte';
    import { simplexGroupLink } from "../settings";
  import { countriesService } from "../store/countries-service";

    const routes: RouteConfig[] = [
        {
            path: "",
            hooks: {
                pre: () => {
                    goto("/#/servers");
                }
            }
        },
        {
            path: "bots",
            component: Bots,
        },
        {
            path: "servers",
            component: Servers,
        },
    ];

    countriesService.fetchCountries();
</script>

<GithubCorner />

<nav class="uk-navbar-container">
    <div class="uk-container uk-container-secondary">
        <div uk-navbar>
            <div class="uk-navbar-left">
                <a class="uk-navbar-item uk-logo" href="/#/" aria-label="Back to Home">
                    Unofficial SimpleX Catalog
                </a>

                <ul class="uk-navbar-nav">
                    <li>
                        <a use:route={{ active: { class: 'uk-active' }}} href="/#/servers">
                            🌐 Servers
                        </a>
                    </li>
                    <li>
                        <a use:route={{ active: { class: 'uk-active' }}} href="/#/bots">
                            🤖 Bots
                        </a>
                    </li>

                    <!-- <li class:uk-active={location.hashPaths.single === '/channels'}>
                        <a use:route={{ active: { class: 'active' }}} href="/channels">
                            📣 Channels
                        </a>
                    </li> -->
                </ul>

                <div class="uk-navbar-item">
                    <Sponsors />
                </div>

                <div class="uk-navbar-item">
                    <div><a href={simplexGroupLink} target="_blank" class="uk-link-text">Join the group chat @ SimpleX!</a></div>
                </div>
            </div>

        </div>
    </div>
    <hr class="uk-margin-remove"/>
</nav>

<Router {routes} />

<div class="uk-section uk-section-secondary uk-text-small uk-text-muted uk-text-center">
    <div class="uk-margin-top">
        The website is not affiliated with the SimpleX team. Content is contributed by anonymous users.
        <br />
        Servers and bots that have been inactive for 90 days or more may be removed from the directory.
    </div>
    <div class="uk-margin-top">
        <span>Powered by</span>
        · <a class="uk-text-muted" href="https://simplex.chat" target="_blank">SimpleX</a>
        · <a class="uk-text-muted" href="https://svelte.dev" target="_blank">Svelte</a>
        · <a class="uk-text-muted" href="https://supabase.com" target="_blank">Supabase</a>
        · <a class="uk-text-muted" href="https://getuikit.com" target="_blank">UIkit</a>
        · <a class="uk-text-muted" href="https://icons8.com" target="_blank">Icons8</a>
    </div>
    <div class="uk-margin-top">
        <a class="uk-text-muted" href="https://asriyan.me" target="_blank">Ed Asriyan</a>
    </div>
</div>

