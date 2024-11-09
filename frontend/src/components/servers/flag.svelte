<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    interface Props {
        value: boolean;
    }

    let { value }: Props = $props();

    const dispatch = createEventDispatcher();

    let src = $derived(value ? 'https://img.icons8.com/ios-filled/50/flag--v1.png' : 'https://img.icons8.com/ios/50/flag--v1.png')
    let tooltip = $derived(value ? 'Click to unflag' : 'Click to flag')
</script>

<img class="pointer" width="15" src={src} alt="flag" uk-tooltip={tooltip} onclick={() => dispatch('click')} />
