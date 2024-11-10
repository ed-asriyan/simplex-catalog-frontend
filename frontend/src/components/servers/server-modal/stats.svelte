<script lang="ts">
  	import { fetchServerStatuses, ServerStatus, type Server } from '../../../database';
    import Plot from './stats-plot.svelte';

	interface Props {
		servers: Server[];
	}

	let { servers }: Props = $props();

	const groupStatusesByServer = function (statuses: ServerStatus[]): { uuid: string; statuses: ServerStatus[] }[] {
		const grouped: { [key: string]: ServerStatus[] } = {};

		for (const status of statuses) {
			if (!grouped[status.serverUuid]) {
				grouped[status.serverUuid] = [];
			}
			grouped[status.serverUuid].push(status);
		}

		return Object.keys(grouped).map(uuid => ({
			uuid,
			statuses: grouped[uuid],
		}));
	}
</script>

<div class="uk-text-center">
	{#await fetchServerStatuses(servers.map(({uuid}) => uuid))}
		<div class="loader uk-flex uk-flex-middle uk-flex-center">
			<div uk-spinner="ratio: 3"></div>
		</div>
	{:then allStatuses}
		{#each groupStatusesByServer(allStatuses) as server (server.uuid)}
			<Plot statuses={server.statuses} />
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
	 