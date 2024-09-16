<script lang="ts">
    export let uri: string;

    let copyTumbler: string = '';
    let timeout: number;
    const copyToClipboard = function (str: string) {
        const input = document.createElement('input');
        input.setAttribute('value', str);
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);

        copyTumbler = str;
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => copyTumbler = '', 4000);
    };

    const maskUri = function (uri: string): string {
        if (uri.endsWith('.onion')) {
            if (uri.includes(',')){
                return uri.replace(/(smp|xftp):\/\/(.+)@(.+)\,(.+)\.onion$/, "$1://<...>@$3,<...>.onion")
            } else {
                return uri.replace(/(smp|xftp):\/\/(.+)@(.+)\.onion$/, "$1://<...>@<...>.onion");
            }
        } else {
            return uri.replace(/(smp|xftp):\/\/(.+)@(.+)/, "$1://<...>@$3");
        }
    };
</script>

<span class="pointer uk-text-break" uk-tooltip="Click to copy full URI" on:click={copyToClipboard(uri)}>
    {#if copyTumbler === uri}
        Copied to clipboard
    {:else}
        <a>{maskUri(uri)}</a>
    {/if}
</span>
