<script lang="ts">
    import QRCode from '@castlenine/svelte-qrcode';
  	import LineUri from './line-uri.svelte';
	import Flag from './flag.svelte';
  	import { flagStore } from './flagged';
  	import type { Server } from '../../database';
	import LineCountry from './line-country.svelte';
	import LineStatus from './line-status.svelte';

	export let servers: Server[];
	let i: number = 0;

	$: server = servers && servers[i];
	$: if (servers) i = 0;

	let dialog;

	$: if (dialog && servers?.length) dialog.showModal();

	$: isTheFirst = i === 0;
	$: isTheLast = i + 1 === servers?.length;
	$: nextText = isTheLast ? 'Close' : 'Next →';

	const handleNext = function () {
		if (isTheLast) {
			dialog.close();
		} else {
			++i;
		}
	};

	const handleBack = function () {
		if (!isTheFirst) {
			--i;
		}
	};
</script>

<dialog
	bind:this={dialog}
	on:close={() => (servers = [])}
	on:click|self={() => dialog.close()}
>
	<div class="uk-text-center" on:click|stopPropagation>
        {#if server}
			{#if servers.length > 1}
				<div>{ i + 1 } / { servers?.length }</div>
			{/if}
			{#key server.uri}
		    	<QRCode data={server.uri} />
			{/key}
			<div>
				<span class="uk-margin-small-right">
					<LineCountry country={server.country} />
				</span>
				<LineStatus status={server.status} />
			</div>

			<div class="uk-margin-small-top">
				<LineUri server={server} />
			</div>
        {/if}
        <div>
			<div class="uk-flex uk-margin-top">
				{#if !isTheFirst}
					<button class="uk-flex-1 uk-button uk-button-default uk-margin-right" autofocus on:click={handleBack}>← Back</button>
				{/if}
				<button class="uk-flex-1 uk-button uk-button-defadult" autofocus on:click={handleNext}>{ nextText }</button>
			</div>
			<button class="uk-margin-top uk-width-1-1 uk-button uk-button" autofocus on:click={() => { flagStore.set(server.uuid, true); handleNext() } }>
				<Flag value={true} />
				&nbsp;
				Flag and { nextText }
			</button>
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
