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

<style>
	/* Style du conteneur principal */
	.login-container {
		background-color: #ffffff;
		padding: 2.5rem;
		border-radius: 12px;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
		width: 100%;
		max-width: 400px;
		margin: 2rem auto;
		display: flex;
		flex-direction: column;
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
	}

	/* Titre */
	h2 {
		color: #333;
		text-align: center;
		margin-bottom: 1.5rem;
		font-weight: 600;
	}

	/* Champs de saisie */
	input {
		width: 100%;
		padding: 12px 15px;
		margin-bottom: 1rem;
		border: 1px solid #ddd;
		border-radius: 8px;
		font-size: 1rem;
		transition: all 0.3s ease;
		box-sizing: border-box; /* Assure que le padding ne dépasse pas */
	}

	input:focus {
		outline: none;
		border-color: #4a90e2;
		box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.2);
	}

	/* Bouton de connexion */
	button {
		background-color: #4a90e2;
		color: white;
		padding: 12px;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: bold;
		cursor: pointer;
		transition:
			background-color 0.3s ease,
			transform 0.1s ease;
		margin-top: 0.5rem;
	}

	button:hover {
		background-color: #357abd;
	}

	button:active {
		transform: scale(0.98);
	}

	/* Placeholder stylisé */
	input::placeholder {
		color: #aaa;
	}
</style>
