<script lang="ts">
	import './styles.css';
	import Dashboard from './Dashboard.svelte';
</script>

<svelte:boundary onerror={(error) => console.error(error)}>
	{#snippet failed(error)}
		<p>Error!</p>
	{/snippet}

	{#snippet pending()}
		<p>Loading</p>
	{/snippet}

	<Dashboard />
</svelte:boundary>
