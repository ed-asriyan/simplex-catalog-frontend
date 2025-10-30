<script lang="ts">
    import QRCode from '@castlenine/svelte-qrcode';
  	import { getServerUri, type Server } from '../../../store/servers-store';
	import type { ServerStatusesService } from '../../../store/server-statuses-service';
	import type { ServerStatusesStore } from '../../../store/server-statuses-store';
    import Stats from './stats.svelte';
	import Modal from '../../modal.svelte';
	import { labelsStore } from '../../../store/labels-store';
  	import LineUri from '../fields/line-uri.svelte';
	import LineCountry from '../fields/line-country.svelte';
	import LineStatus from '../fields/line-status.svelte';
    import LineUptime from '../fields/line-uptime.svelte';
	import LineServerInfo from '../fields/line-server-info.svelte';

	interface Props {
		servers: Server[];
		serverStatusesStore: ServerStatusesStore;
		serverStatusesService: ServerStatusesService;
		onclick?: (server: Server) => void;
	}

	let { servers = $bindable(), onclick, serverStatusesService, serverStatusesStore }: Props = $props();

	let open: boolean = $state(false);

	let i: number = $state(0);

	let server = $derived(servers && servers[i]);
	$effect(() => {
		if (servers) i = 0;
	});

	$effect(() => {
		if (servers?.length) {
			open = true;
		} else {
			open = false;
		}
	});

	let isTheFirst = $derived(i === 0);
	let isTheLast = $derived(i + 1 === servers?.length);
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
        {#if server}
			{#if servers.length > 1}
				<div>{ i + 1 } / { servers?.length }</div>
			{/if}
			{#key server.uuid}
		    	<QRCode data={getServerUri(server)} />
			{/key}
			<div>
				<span class="uk-margin-small-right">
					<LineCountry country={server.country} />
				</span>
				<LineServerInfo server={server} icon={true}/>
				<span class="uk-margin-small-right uk-margin-small-left">
					<LineStatus status={server.status} />
				</span>
				<LineUptime server={server} />
			</div>

			<div class="uk-margin-small-top">
				<LineUri server={server} />
			</div>
        {/if}
        <div>
			<div class="uk-flex uk-margin-top">
				{#if !isTheFirst}
					<button class="uk-flex-1 uk-button uk-button-default uk-margin-right" onclick={handleBack}>← Back</button>
				{/if}
				<button class="uk-flex-1 uk-button uk-button-defadult" onclick={handleNext}>{ nextText }</button>
			</div>
			<button class="uk-margin-top uk-width-1-1 uk-button uk-button" onclick={e => { labelsStore.include(server.uuid, 'added'); handleNext(e) }}>
				Mark as added and { nextText }
			</button>
        </div>
		<div>
			<Stats servers={[server]} {serverStatusesStore} {serverStatusesService} />
		</div>
	</div>
</Modal>
