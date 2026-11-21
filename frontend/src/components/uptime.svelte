<script lang="ts">
    import type { Server } from '@/store/servers/servers-store';
    import type { Bot } from '@/store/bots/bots-store';
    import type { Relay } from '@/store/relays/relays-store';

    interface Props {
        style: 'inline' | 'block';
        server?: Server;
        bot?: Bot;
        relay?: Relay;
    }

    let { server, bot, relay, style }: Props = $props();

    let item: { uptime7: number | null; uptime30: number | null; uptime90: number | null } = $derived(
        (server || bot || relay) as { uptime7: number | null; uptime30: number | null; uptime90: number | null }
    );

    const uptimeStr = function (num: number | null): string {
        return num === null ? 'N/A' : `${Math.round(num * 100)}%`;
    };

    const uptimes: { label: string; key: 'uptime7' | 'uptime30' | 'uptime90' }[] = [
        {
            label: "7 days",
            key: "uptime7"
        },
        {
            label: "30 days",
            key: "uptime30",
        }, 
        {
            label: "90 days",
            key: "uptime90",
        }
    ];
</script>


{#if style === 'inline'}
    <span class="uptime-inline" uk-tooltip={uptimes.map(u => u.label).join(' / ')}>
        {#each uptimes as { key } (key)}
            <span class:uk-text-success={item[key] === 1} class:uk-text-danger={item[key] !== null && item[key] !== 1}>
                { uptimeStr(item[key] as number | null) }
            </span>
        {/each}
    </span>
{:else if style === 'block'}
    <div class="uk-grid-small uk-child-width-auto" data-uk-grid>
        {#each uptimes as { label, key } (key)}
        <div>
            <div class="uk-text-small uk-text-muted">{label}</div>
            <div class="uk-text-large" class:uk-text-danger={item[key] !== null && item[key] !== 1}>
                {uptimeStr(item[key] as number | null)}
            </div>
        </div>
        {/each}
    </div>
{/if}

<style>
    .uptime-inline {
        display: inline-flex;
        gap: 0.5em;
        flex-wrap: wrap;
    }
</style>
