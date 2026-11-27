<script lang="ts">
    interface Props {
        protocol: 'smp' | 'xftp';
    }

    let { protocol }: Props = $props();
</script>

<span
    class='uk-label'
    class:uk-label-default={protocol === 'smp'}
    class:uk-label-warning={protocol === 'xftp'}
>
    {protocol.toUpperCase()}
</span>
