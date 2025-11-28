<script lang="ts">
    import type { Server } from '../store/servers-store';
    import type { Bot } from '../store/bots-store';

    interface Props {
        style: 'inline' | 'block';
    }
    interface PropsA {
        server: Server;
    }
    interface PropsB {
        bot: Bot;
    }

    let { server, bot, style }: Props & (PropsA & PropsB) = $props();

    let item: Server | Bot = $derived(server || bot);

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
    <span uk-tooltip={uptimes.map(u => u.label).join(' / ')}>
        {#each uptimes as { key } (key)}
            <span class={item[key] === 1 ? 'uk-text-success' : 'uk-text-danger'}>
                { uptimeStr(item[key] as number) }
            </span>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
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
