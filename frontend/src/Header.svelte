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
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
		border-bottom: 1px solid #eee;
		font-family: 'Segoe UI', sans-serif;
	}

	h1 {
		margin: 0;
		font-size: 1.5rem;
		color: #333;
		letter-spacing: -0.5px;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.user-info span {
		font-size: 0.9rem;
		color: #666;
		font-weight: 500;
	}

	.user-info button {
		background-color: transparent;
		color: #e74c3c;
		border: 1.5px solid #e74c3c;
		padding: 6px 15px;
		border-radius: 6px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.user-info button:hover {
		background-color: #e74c3c;
		color: white;
	}
</style>
