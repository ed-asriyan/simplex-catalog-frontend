<script lang="ts">
    import QRCode from '@castlenine/svelte-qrcode';

	export let text: string;

	let dialog;

	$: if (dialog && text) dialog.showModal();
</script>

<dialog
	bind:this={dialog}
	on:close={() => (text = null)}
	on:click|self={() => dialog.close()}
>
	<div on:click|stopPropagation>
        {#if text}
		    <QRCode data={text} />
        {/if}
        <div>
            <button class="uk-margin-top uk-width-1-1 uk-button uk-button-desfault" autofocus on:click={() => dialog.close()}>Close</button>
        </div>
	</div>
</dialog>

<style lang="scss">
	dialog {
		max-width: 32em;
		border-radius: 0.2em;
		border: none;
		padding: 0;

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
</style>
