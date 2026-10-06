<script lang="ts">
    import { goto, route, Router, type RouteConfig } from "@mateothegreat/svelte5-router";
    import GithubCorner from './github-corner.svelte';
    import Sponsors from './sponsors.svelte';
    import Servers from './servers/index.svelte';
    import Bots from './bots/index.svelte';
    import Relays from './relays/index.svelte';
    import FAQ from './faq.svelte';
    import { simplexGroupLink } from '@/settings';
    import { countriesService } from '@/store/servers/countries-service';

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
            path: "relays",
            component: Relays,
        },
        {
            path: "servers",
            component: Servers,
        },
        {
            path: "faq",
            component: FAQ,
        },
    ];

    countriesService.fetchCountries();
</script>

{#snippet navLinks()}
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
    <li>
        <a use:route={{ active: { class: 'uk-active' }}} href="/#/relays">
            📡 Relays
        </a>
    </li>
    <li>
        <a href="https://slcw.github.io/SimpleX-Themes/" target="_blank" rel="noopener noreferrer">
            🎨 Themes
        </a>
    </li>
    <li>
        <a use:route={{ active: { class: 'uk-active' }}} href="/#/faq">
            ❓ FAQ
        </a>
    </li>
{/snippet}

<GithubCorner />

<nav class="uk-navbar-container">
    <div class="uk-container uk-container-secondary">
        <div uk-navbar>
            <div class="uk-navbar-left">
                <div class="uk-navbar-item uk-hidden@l">
                    <button type="button" class="uk-navbar-toggle" uk-toggle="target: #mobile-nav" uk-navbar-toggle-icon aria-label="Open menu"></button>
                </div>

                <a class="uk-navbar-item uk-logo" href="/#/" aria-label="Back to Home">
                    SimpleX Catalog
                </a>

                <ul class="uk-navbar-nav uk-visible@l">
                    {@render navLinks()}
                </ul>
            </div>

            <div class="uk-navbar-right">
                <div class="uk-navbar-item uk-visible@l">
                    <a href={simplexGroupLink} target="_blank" class="uk-link-text">Join the group chat @ SimpleX!</a>
                </div>

                <div class="uk-navbar-item uk-visible@l">
                    <Sponsors />
                </div>
            </div>

        </div>
    </div>
    <hr class="uk-margin-remove"/>
</nav>

<div id="mobile-nav" uk-offcanvas="overlay: true">
    <div class="uk-offcanvas-bar">
        <button class="uk-offcanvas-close" type="button" uk-close aria-label="Close menu"></button>
        <ul class="uk-nav uk-nav-default uk-margin-top">
            {@render navLinks()}
            <li class="uk-nav-divider"></li>
            <li>
                <a href={simplexGroupLink} target="_blank">Join the group chat @ SimpleX!</a>
            </li>
            <li class="uk-nav-divider"></li>
            <li>
                <Sponsors />
            </li>
        </ul>
    </div>
</div>

<Router {routes} />

<div class="uk-section uk-section-secondary uk-text-small uk-text-muted uk-text-center">
    <div class="uk-margin-top">
        The website is not affiliated with the SimpleX team. Content is contributed by anonymous users.
        <br />
        Servers, bots and relays that have been inactive for 90 days or more may be removed from the directory.
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

