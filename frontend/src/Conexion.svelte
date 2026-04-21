<script>
	let { login, email, password } = $props();
</script>

<div class="login-container">
	<h2>Connexion</h2>
	<input type="email" placeholder="Email" bind:value={email} />
	<input type="password" placeholder="Mot de passe" bind:value={password} />
	<button onclick={login}>Se connecter</button>
</div>
