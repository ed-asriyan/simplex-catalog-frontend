<script lang="ts">
    import GithubCorner from './github-corner.svelte';
    import ServersTable from './servers/index.svelte';
    import { addServer, doesServerExist, } from '../database';

    const isServerOfficial = function (uri: string): boolean {
        return uri.includes('simplex.im');
    };

    const addServerClick = async function () {
        let input = prompt('Enter SMP or XFTP server URI:');
        input = input?.trim();
        if (!input) return;

        if (isServerOfficial(input)) {
            alert('You entered official SimpleX server. Please add only unofficial SimpleX servers');
            return;
        }

        try {
            if (await doesServerExist(input)) {
                alert('Server already added to the directory');
                return;
            }
            await addServer(input.trim());
            alert('The server is added to the database. If the server is available, it will apper in the table for everyone soon');
        } catch (e) {
            if (e.message.includes('violates check constraint')) {
                alert('Invalid URI. Please verify that you entered it correctly.')
            }
            throw e;
        }
    };
</script>

<GithubCorner />

<div class="uk-container uk-container-xlarge">
    <div class="uk-section uk-section-default uk-text-center uk-padding-remove-bottom">
        <h1 class="uk-heading-small">Unofficial <a href="https://simplex.chat" target="_blank">SimpleX</a> Directory</h1>
    </div>
    <div class="uk-section uk-section-xsmall uk-text-center uk-margin-bottom">
        <div>
            Discover and share community-run <a href="https://simplex.chat/docs/server.html#overview" target="_blank">SMP</a> and <a href="https://simplex.chat/docs/xftp-server.html#overview" target="_blank">XFTP</a> servers.
            <br/>
            Here anyone can anonymously add servers to the public list. The availability of each server is periodically checked.
        </div>
        <div class="uk-margin-top uk-margin-bottom">
            The website is not affiliated with the SimpleX team. Content is contributed by anonymous users.
        </div>
        <button class="uk-button uk-button-default uk-margin-left uk-margin-remove-right" onclick={addServerClick}>Add server anonymously</button>
    </div>
    <ServersTable />
    <div class="uk-section uk-section-default footer uk-text-small uk-text-muted uk-text-center">
        <div class="uk-margin-top">
            <span>Powered by</span>
            · <a class="uk-text-muted" href="https://simplex.chat" target="_blank">SimpleX</a>
            · <a class="uk-text-muted" href="https://svelte.dev" target="_blank">Svelte</a>
            · <a class="uk-text-muted" href="https://supabase.com" target="_blank">Supabase</a>
            · <a class="uk-text-muted" href="https://getuikit.com" target="_blank">UIkit</a>
            · <a class="uk-text-muted" href="https://icons8.com" target="_blank">Icons8</a>
        </div>
        <div>
            <a class="uk-text-muted" href="https://asriyan.me" target="_blank">Ed Asriyan</a>
        </div>
    </div>
</div>
