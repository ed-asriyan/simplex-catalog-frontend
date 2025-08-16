<script lang="ts">
    import type { Server } from '../../store/servers-store';

    interface Props {
        server: Server;
    }

    let { server }: Props = $props();

    const uptimeStr = function (num: number): string {
        return `${Math.round(num * 100)}%`;
    };

    const uptimes: (keyof Server)[] = ['uptime7', 'uptime30', 'uptime90'];
</script>
<!-- 
{#if same}
    <span class={server.uptime7 === 1 ? 'uk-text-success' : 'uk-text-danger'}>{ uptimeStr(server.uptime7) }</span>
{:else} -->
    <span uk-tooltip="7 days / 30 days / 90 days">
        {#each uptimes as uptime (uptime)}
            <span class={server[uptime] === 1 ? 'uk-text-success' : 'uk-text-danger'}>
                { uptimeStr(server[uptime] as number) }
            </span>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        {/each}
    </span>
<!-- {/if} -->
