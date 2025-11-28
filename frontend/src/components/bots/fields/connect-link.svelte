<script lang="ts">
    import type { Bot } from '../../../store/bots-store';
    import { copyToClipboard } from '../../../utils';
    import Icon from '../../icon.svelte';

    interface Props {
        bot: Bot;
    }

    let { bot }: Props = $props();

    let connectLink = $derived(bot.address);
</script>

<span>
    <a href={connectLink} target="_blank" class="uk-link">{connectLink}</a>
    <span class="cursor" onclick={() => copyToClipboard(connectLink)} uk-tooltip="Click to copy full URI">
        <Icon icon="copy" />
    </span>
</span>