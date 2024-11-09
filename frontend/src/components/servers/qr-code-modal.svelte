<script lang="ts">
    import QRCode from '@castlenine/svelte-qrcode';
  	import LineUri from './line-uri.svelte';
	import Flag from './flag.svelte';
  	import { flagStore } from './flagged';
  	import type { Server } from '../../database';
	import LineCountry from './line-country.svelte';
	import LineStatus from './line-status.svelte';

	interface Props {
		servers: Server[];
		onclick: (server: Server) => void;
	}

	let { servers = $bindable(), onclick }: Props = $props();
	let i: number = $state(0);

	let server = $derived(servers && servers[i]);
	$effect(() => {
		if (servers) i = 0;
	});

	let dialog = $state();

	$effect(() => {
		if (dialog && servers?.length) dialog.showModal();
	});

	let isTheFirst = $derived(i === 0);
	let isTheLast = $derived(i + 1 === servers?.length);
	let nextText = $derived(isTheLast ? 'Close' : 'Next →');

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
	onclose={() => (servers = [])}
	onclick={(() => dialog.close())}
>
	<div class="uk-text-center" onclick={onclick}>
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
					<button class="uk-flex-1 uk-button uk-button-default uk-margin-right" autofocus onclick={handleBack}>← Back</button>
				{/if}
				<button class="uk-flex-1 uk-button uk-button-defadult" autofocus onclick={handleNext}>{ nextText }</button>
			</div>
			<button class="uk-margin-top uk-width-1-1 uk-button uk-button" autofocus onclick={() => { flagStore.set(server.uuid, true); handleNext() }}>
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
