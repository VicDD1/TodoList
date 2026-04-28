<script lang="ts">
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

	function onSubmit(evt: Event) {
		evt.preventDefault();
		login();
	}
</script>

<form onsubmit={onSubmit} class="login-container">
	<h2>Connexion</h2>
	<input type="email" placeholder="Email" autocomplete="email" bind:value={email} required />
	<input
		type="password"
		placeholder="Mot de passe"
		autocomplete="current-password"
		bind:value={password}
		required
	/>
	<button type="submit">Se connecter</button>
</form>

<style>
	/* Style du conteneur principal */
	.login-container {
		background-color: #ffffff;
		padding: 2.5rem;
		border-radius: 12px;
		/* Ombre légèrement plus douce pour coller au Header et au Main */
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
		width: 100%;
		max-width: 400px;
		margin: 4rem auto; /* Un peu plus d'espace en haut pour centrer visuellement */
		display: flex;
		flex-direction: column;
		font-family:
			'Inter',
			system-ui,
			-apple-system,
			sans-serif;
	}

	/* Titre */
	h2 {
		color: #1f2937;
		text-align: center;
		margin-bottom: 1.5rem;
		font-weight: 700;
		letter-spacing: -0.025em;
	}

	/* Champs de saisie */
	input {
		width: 100%;
		padding: 12px 15px;
		margin-bottom: 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		font-size: 1rem;
		transition: all 0.2s ease;
		box-sizing: border-box;
		background-color: #f9fafb; /* Très léger gris pour les champs */
	}

	input:focus {
		outline: none;
		background-color: #ffffff;
		border-color: #4f46e5;
		box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
	}

	/* Bouton de connexion */
	button {
		background-color: #4f46e5;
		color: white;
		padding: 12px;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		margin-top: 0.5rem;
	}

	button:active {
		transform: scale(0.98);
	}

	/* Placeholder stylisé */
	input::placeholder {
		color: #9ca3af;
	}
</style>
