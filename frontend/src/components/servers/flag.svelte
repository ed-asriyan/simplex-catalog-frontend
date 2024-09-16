<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    export let value: boolean;

    const dispatch = createEventDispatcher();

    $: src = value ? 'https://img.icons8.com/ios-filled/50/flag--v1.png' : 'https://img.icons8.com/ios/50/flag--v1.png'
    $: tooltip = value ? 'Click to unflag' : 'Click to flag'
</script>

<img class="pointer" width="15" src={src} alt="flag" uk-tooltip={tooltip} on:click={() => dispatch('click') } />
