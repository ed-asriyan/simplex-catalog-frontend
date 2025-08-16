<script lang="ts">
  	import type { ServerStatusesService } from '../../../store/server-statuses-service';
  	import type { ServerStatusesStore } from '../../../store/server-statuses-store';
  	import type { Server } from '../../../store/servers-store';
    import Plot from './stats-plot.svelte';

	interface Props {
		servers: Server[];
		serverStatusesStore: ServerStatusesStore;
		serverStatusesService: ServerStatusesService;
	}

	let { servers, serverStatusesService, serverStatusesStore }: Props = $props();
</script>

<div class="uk-text-center">
	{#await serverStatusesService.fetch(servers.map(({uuid}) => uuid))}
		<div class="loader uk-flex uk-flex-middle uk-flex-center">
			<div uk-spinner="ratio: 3"></div>
		</div>
	{:then}
		{#each servers as server (server.uuid)}
			<Plot server={server} {serverStatusesStore} />
		{/each}
	{/await}
</div>

<style>
	.loader {
		height: 16rem;
		align-items: center;
		justify-content: center;
	}
</style>
	 