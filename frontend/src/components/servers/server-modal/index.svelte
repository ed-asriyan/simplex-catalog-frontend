<script lang="ts">
  	import { type Server } from '@/store/servers/servers-store';
	import Modal from '@/components/modal.svelte';
	import { labelsStore } from '@/store/servers/labels-store';
	import LineCountry from '../fields/line-country.svelte';
	import LineStatus from '../fields/line-status.svelte';
    import LineUptime from '@/components/uptime.svelte';
	import LineServerInfo from '../fields/line-server-info.svelte';
	import ServerQrCode from '../fields/server-qrcode.svelte';

	interface Props {
		serverGroups: Server[][];
		onclick?: (server: Server) => void;
	}

	let { serverGroups = $bindable(), onclick }: Props = $props();
	let open: boolean = $state(false);

	let i: number = $state(0);

	let group: Server[] = $derived(serverGroups && serverGroups[i]);

	$effect(() => {
		if (serverGroups) i = 0;
	});

	$effect(() => {
		if (serverGroups?.length) {
			open = true;
		} else {
			open = false;
		}
	});

	let isTheFirst = $derived(i === 0);
	let isTheLast = $derived(i + 1 === serverGroups?.length);
	let nextText = $derived(isTheLast ? 'Close' : 'Next →');

	const handleNext = function () {
		if (isTheLast) {
			open = false;
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

<Modal bind:open={open} width="500px">
	<div class="uk-text-center" onclick={onclick}>
        {#if group && group.length > 0}
			{#if serverGroups.length > 1}
				<div>{ i + 1 } / { serverGroups?.length }</div>
			{/if}
			<ServerQrCode servers={group} />

			{#each group as server (server.uuid)}
				<div class="uk-margin-small-top">
					<span class="uk-margin-small-right">
						<LineCountry country={server.country} />
					</span>
					<LineServerInfo server={server} icon={true}/>
					<span class="uk-margin-small-right uk-margin-small-left">
						<LineStatus status={server.status} />
					</span>
				</div>
			{/each}

			<div class="uk-margin-small-top">
				<LineUptime servers={group} style="inline" />
			</div>
        {/if}
        <div>
			<div class="uk-flex uk-margin-top">
				{#if !isTheFirst}
					<button class="uk-flex-1 uk-button uk-button-default uk-margin-right" onclick={handleBack}>← Back</button>
				{/if}
				<button class="uk-flex-1 uk-button uk-button-defadult" onclick={handleNext}>{ nextText }</button>
			</div>
			{#if group}
				<button class="uk-margin-top uk-width-1-1 uk-button uk-button" onclick={e => { group.forEach(s => labelsStore.include(s.uuid, 'added')); handleNext(e) }}>
					Mark as added and { nextText }
				</button>
			{/if}
        </div>
	</div>
</Modal>
