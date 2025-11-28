
<script lang="ts">
    import moment from "moment";
    import { botsService, type Filter, type Sort } from "../../store/bots-service";
    import { botsStore, type Bot } from "../../store/bots-store";
    import { convertUTCDateToLocalDate, delay, setQueryParam } from "../../utils";
    import Icon from "../icon.svelte";
    import { goto } from "@mateothegreat/svelte5-router";
    
    interface Props {
        route: any,
    }

    let { route }: Props = $props();

    let q = $derived(route.result.querystring.params.q || "");

    let filter: Filter = $derived({
        isOnline: true,
        text: q,
    });

    let sort: Sort = {
      field: "is_online",
      order: "asc",
    };

    let currentPageUuids: Promise<string[]> = $derived(
        botsService
            .fetch(filter, sort, 10, 1)
    );
    let currentPageBots: Promise<Bot[]> = $derived(
        currentPageUuids.then(
            uuids => uuids.map(uuid => botsStore.getBy("uuid", uuid).get()).filter(x => !!x)
        )
    );
 
    let _searchText = $state("");

    const onSearch = function () {
        setQueryParam(route, { q: _searchText });
    };

    const refresh = function () {
        filter = { ...filter };
    };

    const addBotClick = async function () {
        const input = prompt('Enter invite link:')?.trim();
        if (!input) return;

        try {
            await botsService.addBot(input.trim());
            alert('The bot is added to the database. If the bot is available, it will soon appear in the table for everyone.');
        } catch (e: any) {
            alert(e.message);
            throw e;
        }
    };
</script>

<div class="uk-section uk-section-default uk-section-small">
    <div class="uk-container uk-text-center">
        <h2 class="uk-heading-medium">🤖 Bots</h2>
        <div>
            Discover and share community-run SimpleX bots.
            <br/>
            Here anyone can anonymously add bots to the public list. The availability of each bot is checked periodically.
        </div>
    </div>

    <div class="uk-container uk-text-center uk-margin-top">
        <button class="uk-button uk-button-default uk-margin-left uk-margin-remove-right" onclick={addBotClick}>Add bot anonymously</button>
    </div>
</div>

<hr class="uk-margin-remove"/>
<div class="uk-section uk-section-muted uk-section-small">
    <div class="uk-container uk-container-small">
        <div class="uk-text-center">
                {#await currentPageUuids}
                    <span class="uk-margin-small-right" uk-spinner="ratio: 1.2"></span>
                {:then _}
                     <span class="uk-margin-small-right cursor" onclick={refresh} title="Refresh">
                        <Icon icon="🔄" />
                    </span>
                {/await}
            <form class="uk-search uk-search-default uk-search-navbar uk-width-2-3">
                <span>
                    <span uk-search-icon></span>
                    <input class="uk-search-input" type="search" placeholder="Search" aria-label="Search" bind:value={_searchText} onkeyup={delay(onSearch, 1500)}>
                </span>
                <!-- <label class="uk-margin-small-left">
                    <input
                        class="uk-checkbox"
                        type="checkbox"
                        bind:checked={showOnlineOnly}
                        onchange={refresh}
                    />
                    Show only active
                </label> -->
            </form>
        </div>
    </div>
</div>
<div class="uk-section uk-section-muted uk-section-small uk-padding-remove-top">
    <div class="uk-container uk-container-default">
        {#await currentPageBots}
            <span class="uk-margin-small-right" uk-spinner="ratio: 1.2"></span>
        {:then currentPageBots}
            {#each currentPageBots as bot}
                <div class="uk-card uk-card-default uk-card-hover uk-width-1-3@m cursor" onclick={() => goto(`/#/bots/${bot.uuid}`)}>
                    <div class="uk-card-header">
                        <div class="uk-grid-small uk-flex-middle" uk-grid>
                            <div class="uk-width-auto">
                                {#if bot.photo}
                                    <img class="uk-border-circle" width="40" height="40" src={bot.photo} alt="Avatar">
                                {:else}
                                    <div class="uk-border-circle uk-background-muted uk-flex uk-flex-center uk-flex-middle" style="width: 40px; height: 40px; font-size: 30px;">
                                        🤖
                                    </div>
                                {/if}
                            </div>
                            <div class="uk-width-expand">
                                <h3 class="uk-card-title uk-margin-remove-bottom uk-text-bold">{bot.name}</h3>
                                {#if bot.lastCheck}
                                    <p class="uk-text-meta uk-margin-remove-top">
                                        Last check: <time>{moment(convertUTCDateToLocalDate(bot.lastCheck)).fromNow()}</time>
                                    </p>
                                {/if}
                            </div>
                        </div>
                    </div>
                    {#if bot.description}
                        <div class="uk-card-body">
                            <p>{bot.description}</p>
                        </div>
                    {/if}
                    <div class="uk-card-footer">
                        <a href={bot.address} onclick={e => e.stopPropagation()} target="_blank" class="uk-button uk-button-text">Visit</a>
                    </div>
                </div>
            {/each}
            {#if currentPageBots.length === 0}
                <p class="uk-text-center">No bots found.</p>
            {/if}
        {:catch error}
            <p class="uk-text-center uk-text-danger">Error loading bots: {error.message}</p>
        {/await}
    </div>
</div>

<style lang="scss">
    .uk-card-body {
        white-space: pre-line;
    }
</style>