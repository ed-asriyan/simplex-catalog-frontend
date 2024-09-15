<script lang="ts">
    import GithubCorner from './github-corner.svelte';
    import ServersTable from './servers-table.svelte';
</script>

<GithubCorner />

<div class="uk-container uk-container-small">
    <div class="uk-section uk-section-default uk-text-center uk-padding-remove-bottom">
        <h1 class="uk-heading-small">Unofficial <a href="https://simplex.chat" target="_blank">SimpleX</a> Servers Registry</h1>
    </div>
    <div class="uk-section uk-section-xsmall uk-text-center uk-margin-bottom">
        <div>
            Here, you can discover and share community-run SMP and XFTP servers contributed by users like you. The website allows for easy browsing and filtering of SMP & XFTP servers, but please note that all entries are submitted anonymously. Availability of the listed servers are periodically verifyed by the automation.
        </div>
        <div class="uk-margin-top">
            It's important to remember that this site operates independently and is not affiliated with the SimpleX team. The content provided is solely the responsibility of the contributors.
        </div>
    </div>
    <ServersTable />
    <div class="uk-section uk-section-default footer uk-text-small uk-text-muted uk-text-center">
        <div class="uk-margin-top">
            <span>Powered by</span>
            · <a class="uk-text-muted" href="https://simplex.chat" target="_blank">SimpleX</a>
            · <a class="uk-text-muted" href="https://svelte.dev" target="_blank">Svelte</a>
            · <a class="uk-text-muted" href="https://supabase.com" target="_blank">Supabase</a>
            · <a class="uk-text-muted" href="https://getuikit.com" target="_blank">UIkit</a>
        </div>
        <div>
            <a class="uk-text-muted" href="https://asriyan.me" target="_blank">Ed Asriyan</a>
        </div>
    </div>
</div>
