<script lang="ts">
    import { labelsStore, labels, type Label } from '../../store/labels-store';

    interface Props {
        uuid: string;
    }

    let { uuid }: Props = $props();

    const colourMap: {[x: Label]: string} = {
        ignored: 'danger',
        added: 'success',
    };

    const namesMap: {[x: Label]: string} = {
        ignored: '🚫',
        added: '✅',
    };

    const tooltipMap: {[x: Label]: string} = {
        ignored: ['Ignore', 'Ignored'],
        added: ['Add', 'Added'],
    };
</script>

{#each labels as label}
    <span
        class={`uk-label uk-label-${colourMap[label]} uk-margin-small-right cursor`}
        class:uk-label-muted={!$labelsStore[label].has(uuid)}
        on:click={() => labelsStore.toggle(uuid, label)}
        uk-tooltip={tooltipMap[label][$labelsStore[label].has(uuid) ? 1 : 0]}
    >
        {namesMap[label]}
    </span>
{/each}
