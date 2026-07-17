<script lang="ts">
    import type { Server } from '@/store/servers/servers-store';
    import type { Bot } from '@/store/bots/bots-store';
    import type { Relay } from '@/store/relays/relays-store';

    interface Props {
        style: 'inline' | 'block';
        servers?: Server[];
        bot?: Bot;
        relay?: Relay;
    }

    let { servers, bot, relay, style }: Props = $props();

    const avg = (vals: number[]) => vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;

    let item: { uptime7: number; uptime30: number; uptime90: number } = $derived(
        servers && servers.length > 0
            ? { uptime7: avg(servers.map(s => s.uptime7)), uptime30: avg(servers.map(s => s.uptime30)), uptime90: avg(servers.map(s => s.uptime90)) }
            : (bot || relay) as { uptime7: number; uptime30: number; uptime90: number }
    );

    const uptimeStr = function (num: number): string {
        return `${Math.round(num * 100)}%`;
    };

    const uptimes: { label: string; key: keyof Bot }[] = [
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
            <span class={item[key] === 1 ? 'uk-text-success' : 'uk-text-danger'}>
                { uptimeStr(item[key] as number) }
            </span>
        {/each}
    </span>
{:else if style === 'block'}
    <div class="uk-grid-small uk-child-width-auto" data-uk-grid>
        {#each uptimes as { label, key } (key)}
        <div>
            <div class="uk-text-small uk-text-muted">{label}</div>
            <div class="uk-text-large" class:uk-text-danger={item[key] !== 1}>
                {uptimeStr(item[key] as number)}
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
