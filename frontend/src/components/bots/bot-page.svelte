<script lang="ts">
    import { onMount } from 'svelte';
    import { botsService } from '../../store/bots-service';
    import { botsDetailsService, BotsDetailsService } from '../../store/bots-details-service';
    import { botsStore } from '../../store/bots-store';
    import { botsDetailsStore } from '../../store/bots-details-store';
    import { botsStatusesStore } from '../../store/bots-statuses-store';
    import { botsStatusesService } from '../../store/bots-statuses-service';
    import { convertUTCDateToLocalDate, copyToClipboard } from '../../utils';
    import moment from 'moment';
    import LineStatus from './fields/status.svelte';
    import Uptime from '../uptime.svelte';
    import LineMessages from './fields/messages.svelte';
    import Icon from '../icon.svelte';
    import TimelinePlot, { type Color, type Item } from '../timeline-plot.svelte';

    interface Props {
        route: any;
    }

    let { route }: Props = $props();
    let { uuid } = $derived(route.result.path.params || {});

    let bot = $derived(botsStore.getBy('uuid', uuid));
    let botDetails = $derived(botsDetailsStore.getBy('botUuid', uuid));
    let botStatuses = $derived(botsStatusesStore.getByIndex('botUuid', uuid));

    let loadingPromise: Promise<any> = $derived(
        uuid ? Promise.all([
            botsService.fetch({ uuids: { inclusive: true, values: [uuid] } }, { field: 'is_online', order: 'desc' }, 1, 1),
            botsDetailsService.fetch(uuid),
            botsStatusesService.fetch([uuid]),
        ]) : Promise.resolve()
    );

    let timelineItems: Item[] = $derived(
        $botStatuses?.map(status => ({
            timestamp: status.createdAt,
            series: {
                "Is Online": {
                    color: (status.isOnline ? 'green' : 'red') as Color,
                    context: "",
                },
            }
        }) as Item)
    );
</script>

<div class="uk-section uk-section-muted">
    <div class="uk-container">
        {#await loadingPromise}
            <div class="uk-text-center uk-margin-large-top">
                <span data-uk-spinner="ratio: 3"></span>
            </div>
        {:then _}
            {#if $bot && $botDetails}
                <div class="uk-card uk-card-default uk-card-body">
                    <div class="uk-grid-small uk-flex-middle" data-uk-grid>
                        <div class="uk-width-auto">
                            {#if $bot.photo}
                                <img class="uk-border-circle" width="80" height="80" src={$bot.photo} alt={$bot.name}>
                            {:else}
                                <div class="uk-border-circle uk-background-muted uk-flex uk-flex-center uk-flex-middle" style="width: 80px; height: 80px; font-size: 40px;">
                                    🤖
                                </div>
                            {/if}
                        </div>
                        <div class="uk-width-expand">
                            <h3 class="uk-card-title uk-margin-remove-bottom uk-text-bold">
                                {$bot.name}
                                &nbsp;
                                <LineStatus status={$bot.isOnline} />
                            </h3>
                            <div class="uk-text-meta uk-margin-remove-top">
                                {#if $bot.lastCheck}
                                    <div uk-tooltip={convertUTCDateToLocalDate($bot.lastCheck).toLocaleString()}>
                                        Last check: {moment(convertUTCDateToLocalDate($bot.lastCheck)).fromNow()}
                                    </div>
                                {/if}
                                <div class="uk-margin-small-top">
                                    <a class="uk-button uk-button-primary uk-button-small" href={$bot.address} target="_blank">
                                        Open the bot
                                    </a>
                                    <span uk-tooltip="Copy connection link to clipboard" class="cursor uk-margin-small-left" onclick={() => copyToClipboard($bot.address)}>
                                        <Icon icon="copy" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div uk-grid>
                        <div class="uk-width-1-2@m">
                            <div>
                                <h4 class="uk-margin-remove-bottom">Description</h4>
                                <div>
                                    {#if $bot.description}
                                        {$bot.description}
                                    {:else}
                                        <i class="uk-text-muted uk-text-small">Empty. Read "The First Bot's Message" to understand how the bot works.</i>
                                    {/if}
                                </div>
                            </div>
                            {#if $botDetails}
                                {#if $botDetails.commands && $botDetails.commands.length > 0}
                                    <h4>Commands</h4>
                                    <table class="uk-table uk-table-divider uk-table-small uk-table-striped">
                                        <thead>
                                            <tr>
                                                <th>Keyword</th>
                                                <th>Label</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {#each $botDetails.commands as command}
                                                <tr>
                                                    <td><code>{command.keyword}</code></td>
                                                    <td>{command.label}</td>
                                                </tr>
                                            {/each}
                                        </tbody>
                                    </table>
                                {/if}
                            {/if}
                        </div>
                        <div class="uk-width-1-2@m">
                            {#if $botDetails.replyMessage}
                                <LineMessages botDetails={$botDetails} />
                            {/if}
                        </div>
                    </div>
                    
                    <div class="uk-margin-top">
                        <h4>Uptime</h4>
                        <Uptime bot={$bot} style="block" />
                        {#if timelineItems}
                            <TimelinePlot items={timelineItems} />
                        {/if}
                    </div>
                    <p class="uk-text-small uk-text-muted" uk-tooltip={convertUTCDateToLocalDate($bot.createdAt).toLocaleString()}>
                        The bot was added to the catalog {moment(convertUTCDateToLocalDate($bot.createdAt)).fromNow()}
                    </p>
                </div>
            {:else}
                <div class="uk-alert-warning" data-uk-alert>
                    <p>Bot not found.</p>
                </div>
            {/if}
        {:catch error}
            <div class="uk-alert-danger" data-uk-alert>
                <p>{error}</p>
            </div>
        {/await}
    </div>
</div>