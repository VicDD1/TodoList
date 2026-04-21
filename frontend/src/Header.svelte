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
