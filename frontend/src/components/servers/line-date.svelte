<script lang="ts">
    import { readable } from 'svelte/store';
    import moment from 'moment';
    import { convertUTCDateToLocalDate } from '../../utils';

    export let date: string;

    $: dateObj = date && new Date(date);

    const display = readable<string>(null, set => {
        const interval = setInterval(() => {
            dateObj && set(moment(convertUTCDateToLocalDate(dateObj)));
        }, 1000);

        return function stop() {
            clearInterval(interval);
        };
});
</script>

{#if $display}
    <span uk-tooltip={$display ? $display.format('YYYY-MM-DD hh-mm-ss') : ""}>
        {$display.fromNow()}
    </span> 
{/if}
