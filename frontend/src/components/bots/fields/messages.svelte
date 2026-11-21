<script lang="ts">
    import type { BotDetails } from '@/store/bots/details-store';

    interface Props {
        botDetails: BotDetails;
    }

    let { botDetails }: Props = $props();

    let greetingMessage = $derived(botDetails.greetingMessage);
</script>

<div class="uk-margin">
    <h4>The First Bot's Message</h4>
    <div class="uk-placeholder uk-background-muted" style="white-space: pre-wrap;">{greetingMessage}</div>
</div>