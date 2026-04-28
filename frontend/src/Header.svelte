<script>
	let { me, onlogout } = $props();
</script>

<header>
	<h1>Ma Todo List</h1>
	<div class="user-info">
		<span>Connecté en tant que {me.name}</span>
		<button onclick={onlogout}>Déconnexion</button>
	</div>
</header>

<style>
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 5%;
		background-color: #ffffff;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
		border-bottom: 1px solid #e5e7eb;
		font-family:
			'Inter',
			system-ui,
			-apple-system,
			sans-serif;
	}

	h1 {
		margin: 0;
		font-size: 1.4rem;
		color: #1f2937; /* Gris très foncé pour le texte principal */
		letter-spacing: -0.025em;
		font-weight: 700;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.user-info span {
		font-size: 0.9rem;
		color: #6b7280; /* Texte secondaire (muted) */
		font-weight: 500;
	}

	.user-info button {
		background-color: transparent;
		color: #ef4444; /* Rouge moderne plus vif */
		border: 1.5px solid #ef4444;
		padding: 6px 16px;
		border-radius: 8px; /* Arrondis cohérents avec le reste du UI */
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.user-info button:active {
		transform: translateY(0);
	}
</style>
