<script lang="ts">
    interface Props {
        icon: string;
    }

    let { icon }: Props = $props();
</script>

{#if icon === 'tor'}
    <img width="22" height="22" src="https://img.icons8.com/nolan/64/tor-browser.png" alt="tor-browser"/>
{:else if icon === 'link'}
    <img width="20" height="20" src="https://img.icons8.com/ios/50/link--v1.png" alt="link--v1"/>
{:else if icon === 'copy'}
    <img width="15" height="15" src="https://img.icons8.com/a7a7a7/material-sharp/24/copy.png" alt="copy--v1"/>
{:else}
    {icon}
{/if}
