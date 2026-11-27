<script lang="ts">
    interface Props {
        open: boolean;
        children: any;
        width?: string;
        height?: string;
    }

    let {
        open = $bindable(),
        width = '24em',
        height = '',
        children,
    }: Props = $props();

    const show = function (element: HTMLDialogElement) {
        element.showModal();
    };
</script>

{#if open}
    <dialog
        use:show
        onclose={() => (open = false)}
        style:width={width}
        style:height={height}
    >
		<button class="close" type="button" aria-label="Close" uk-close onclick={() => open = false}></button>
        {@render children?.()}
    </dialog>
{/if}

<style lang="scss">
	$padding: 1rem;

	dialog {
		border-radius: 0.2em;
        max-height: 90vh;
        overflow: scroll;
		border: none;
		padding: $padding;

		&::backdrop {
			background: rgba(0, 0, 0, 0.3);
		}

		& > div {
			padding: 1em;
		}

		&[open] {
			animation: zoom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
		}

		&[open]::backdrop {
			animation: fade 0.2s ease-out;
		}
	}

	@keyframes zoom {
		from {
			transform: scale(0.95);
		}
		to {
			transform: scale(1);
		}
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.close {
		position: absolute;
		top: $padding;
		right: $padding;
	}
</style>
