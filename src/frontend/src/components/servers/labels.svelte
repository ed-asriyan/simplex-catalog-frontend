<script lang="ts">
    import { labels, type Label } from '@/store/servers/labels-store';
    import { useWebsite } from '@/store/website';

    const { labels: labelsStore } = useWebsite();

    interface Props {
        uuid?: string;
        uuids?: string[];
    }

    let { uuid, uuids }: Props = $props();

    let allUuids: string[] = $derived(uuids || (uuid ? [uuid] : []));

    const colourMap: Record<Label, string> = {
        ignored: 'danger',
        added: 'success',
    };

    const namesMap: Record<Label, string> = {
        ignored: '🚫',
        added: '✅',
    };

    const tooltipMap: Record<Label, [string, string]> = {
        ignored: ['Ignore', 'Ignored'],
        added: ['Add', 'Added'],
    };

    // Active if ALL uuids have the label
    const isActive = (label: Label) => allUuids.length > 0 && allUuids.every(u => $labelsStore[label].includes(u));

    const toggleAll = (label: Label) => {
        for (const u of allUuids) {
            labelsStore.toggle(u, label);
        }
    };
</script>

{#each labels as label}
    <span
        class={`uk-label uk-label-${colourMap[label]} uk-margin-small-right cursor`}
        class:uk-label-muted={!isActive(label)}
        on:click={() => toggleAll(label)}
        uk-tooltip={tooltipMap[label][isActive(label) ? 1 : 0]}
    >
        {namesMap[label]}
    </span>
{/each}
