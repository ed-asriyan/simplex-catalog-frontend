<script lang="ts">
    import { onMount } from 'svelte';
    import { readable, type Readable } from 'svelte/store';
    import moment from 'moment';
    import { convertUTCDateToLocalDate } from '@/utils';

    interface Props {
        date: Date | null;
    }

    let { date }: Props = $props();

    const getMoment = function (): moment.Moment | null {
        return date && moment(convertUTCDateToLocalDate(date));
    };
 
    let display: Readable<moment.Moment | null> = $state(null);

    onMount(() => {
        display = readable<moment.Moment | null>(getMoment(), set => {
            const interval = setInterval(() => {
                date && set(getMoment());
            }, 1000);

            return function stop() {
                clearInterval(interval);
            };
        });
    });
</script>

{#if $display}
    <span uk-tooltip={$display ? $display.format('YYYY-MM-DD hh-mm-ss') : ""}>
        {$display?.fromNow() || 'never'}
    </span> 
{/if}
