
<script lang="ts">
    import { onMount } from "svelte";
    import moment from "moment";
    import { botsService, type Filter, type Sort } from '@/store/bots/bots-service';
    import { botsStore, type Bot } from '@/store/bots/bots-store';
    import { convertUTCDateToLocalDate, delay, setQueryParam } from '@/utils';
    import Icon from '@/components/icon.svelte';
    import { goto } from "@mateothegreat/svelte5-router";
    import StatusBadge from "../status-badge.svelte";
    
    interface Props {
        route: any,
    }

    let { route }: Props = $props();

    let params = $derived(route.result.querystring.params);

    const generateFilter = function (params: any): Filter {
        return {
            status: params?.filterStatus === 'true' ? true : params?.filterStatus === 'false' ? false : params?.filterStatus === 'any' ? undefined : undefined,
            text: params?.q || undefined,
        };
    };

    const defaultFilter: Filter = { status: true };

    onMount(() => {
        const generatedFilter = generateFilter(params);
        if (Object.values(generatedFilter || {}).filter(x => x !== undefined).length === 0) {
            const stored = JSON.parse(localStorage.getItem('botsFilter') || 'null') as Filter | null;
            setFilter(stored && Object.values(stored).some(x => x !== undefined) ? stored : defaultFilter);
        }
    });

    let filter: Filter = $derived({
        ...defaultFilter,
        ...generateFilter(params),
    });

    const setFilter = function (newFilter: Filter) {
        localStorage.setItem('botsFilter', JSON.stringify(newFilter));
        setQueryParam(route, {
            filterStatus: newFilter.status === undefined ? 'any' : newFilter.status ? 'true' : 'false',
            q: newFilter.text || '',
            pageNumber: '1',
        });
    };

    let sort: Sort = {
      field: "is_online",
      order: "desc",
    };

    let pageNumber: number = $derived(+params.pageNumber || 1);
    let pageSize: number = $derived(+params.pageSize || 12);
    
    let totalCountStore = $derived(botsStore.totalCount);
    let totalCount: number = $derived($totalCountStore);
    let pageCount: number = $derived(Math.ceil(totalCount / pageSize) || 1);

    const changePage = function (newPage: number) {
        if (newPage < 1 || newPage > pageCount) return;
        setQueryParam(route, {
            'pageNumber': String(newPage),
        });
    };

    let currentPageUuids: Promise<string[]> = $derived(
        botsService
            .fetch(filter, sort, pageSize, pageNumber)
    );
    let currentPageBots: Promise<Bot[]> = $derived(
        currentPageUuids.then(
            uuids => uuids.map(uuid => botsStore.getBy("uuid", uuid).get()).filter(x => !!x)
        )
    );
 
    let _searchText = $derived(filter.text || '');

    const onSearch = function (text: string) {
        setFilter({ ...filter, text });
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

<div class="uk-section uk-section-default uk-section-small uk-text-center">
    <div class="uk-container">
        <h2 class="uk-heading-medium">🤖 Bots</h2>
        <div>
            Discover and share community-run SimpleX bots.
            <br/>
            Here anyone can anonymously add bots to the public list. The availability of each bot is checked periodically.
        </div>
    </div>

    <div class="uk-container uk-margin-top uk-margin-bottom">
        <button class="uk-button uk-button-default uk-margin-remove-right" onclick={addBotClick}>Add bot anonymously</button>
    </div>

    <div class="uk-text-small">
        <a href="/#/faq" class="uk-link-muted">How to create your own bot?</a>
    </div>
</div>

<hr class="uk-margin-remove"/>

<div class="uk-section uk-section-muted uk-section-small">
    <div class="uk-container uk-container-small uk-container-default">
        <div uk-grid>
            <div class="uk-width-auto">
                {#await currentPageUuids}
                    <span class="uk-margin-small-right" uk-spinner="ratio: 1.2"></span>
                {:then _}
                    <span class="uk-margin-small-right cursor" onclick={refresh} title="Refresh">
                        <Icon icon="🔄" />
                    </span>
                {/await}
            </div>
            <form class="uk-width-expand uk-search uk-search-default uk-search-navbar">
                <span>
                    <span uk-search-icon></span>
                    <input class="uk-search-input" type="search" placeholder="Search" aria-label="Search" value={_searchText} onkeyup={delay(e => onSearch(e.target.value), 1500)}>
                </span>
            </form>
            <select class="uk-width-auto@m uk-width-1-1@s uk-select uk-form-width-small uk-margin-left" value={filter.status === undefined ? 'any' : filter.status.toString()} onchange={e => setFilter({ ...filter, status: e.target.value === 'any' ? undefined : e.target.value === 'true' })}>
                <option value="any">All</option>
                <option value="true">Online</option>
                <option value="false">Offline</option>
            </select>
        </div>
    </div>
</div>
<div class="uk-section uk-section-muted uk-section-small uk-padding-remove-top">
    <div class="uk-container uk-container-default">
        {#await currentPageBots}
            <span class="uk-margin-small-right" uk-spinner="ratio: 1.2"></span>
        {:then currentPageBots}
            <div uk-grid class="uk-grid-medium uk-grid-match">
                {#each currentPageBots as bot}
                    <div class="uk-width-1-3@m">
                        <div class="uk-card uk-card-default uk-card-hover cursor uk-flex uk-flex-column" onclick={() => goto(`/#/bots/${bot.uuid}`)}>
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
                                        <h3 class="uk-card-title uk-margin-remove-bottom uk-text-bold">
                                            {bot.name}
                                        </h3>
                                        {#if !bot.status}
                                            <StatusBadge items={[ bot ]} />
                                        {/if}
                                        {#if bot.lastCheck}
                                            <p class="uk-text-meta uk-margin-remove-top">
                                                Last check: <time>{moment(convertUTCDateToLocalDate(bot.lastCheck)).fromNow()}</time>
                                            </p>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                                <div class="uk-card-body uk-flex-1">
                                    <p>{bot.description || "No description"}</p>
                                </div>
                            <div class="uk-card-footer">
                                <a href={bot.address} onclick={e => e.stopPropagation()} target="_blank" class="uk-button uk-button-text">Visit</a>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
            {#if currentPageBots.length === 0}
                <p class="uk-text-center">No bots found.</p>
            {/if}
            {#if totalCount > 0}
                <div class="uk-flex uk-flex-middle uk-flex-center uk-margin-large-top uk-flex-column uk-text-center pages">
                    <div class="uk-margin-bottom">
                        Total bots matching filters: {totalCount}
                    </div>
                    <div>
                        <div class="uk-margin-bottom">
                            {#each Array.from({ length: pageCount }, (_, i) => i + 1) as page}
                                <button class="uk-button uk-button-default uk-button-small uk-margin-small-right" class:uk-button-secondary={page === pageNumber} onclick={() => changePage(page)}>
                                    {page}
                                </button>
                            {/each}
                        </div>
                        {#if pageNumber > 1}
                            <button class="uk-button uk-button-default uk-margin-small-right" onclick={() => changePage(pageNumber - 1)}>
                                ← Previous page
                            </button>
                        {/if}
                        {#if pageNumber < pageCount}
                            <button class="uk-button uk-button-default" onclick={() => changePage(pageNumber + 1)}>
                                Next page →
                            </button>
                        {/if}
                    </div>
                </div>
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
    .pages {
        width: 100%;
        max-width: 100vw;
    }
</style>