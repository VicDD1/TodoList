<script>
	let { API_URL, email, password, token = $bindable(), me = $bindable() } = $props();

	async function login() {
		try {
			const response = await fetch(API_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: `
	        mutation($email: String!, $password: String!) {
			authenticateUserWithPassword(email: $email, password: $password) {
	            ... on UserAuthenticationWithPasswordSuccess {
					sessionToken
				item {
	                id
	                name
	                email
					}
	            }
	            ... on UserAuthenticationWithPasswordFailure {
					message
	            }
			}
	        }`,
					variables: { email: email, password: password }
				})
			});

			const result = await response.json();

			if (result.errors) {
				console.error("Détail de l'erreur serveur :", result.errors);
				alert('Erreur serveur : ' + result.errors[0].message);
				return;
			}

			const auth = result.data.authenticateUserWithPassword;

			if (auth.sessionToken) {
				token = auth.sessionToken;
			} else {
				alert(auth.message || 'Email ou mot de passe incorrect');
			}
		} catch (err) {
			console.error('Erreur technique :', err);
		}
	}
</script>

<div class="login-container">
	<h2>Connexion</h2>
	<input type="email" placeholder="Email" bind:value={email} />
	<input type="password" placeholder="Mot de passe" bind:value={password} />
	<button onclick={login}>Se connecter</button>
</div>
