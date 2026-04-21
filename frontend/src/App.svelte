<script lang="ts">
	import { onMount } from 'svelte';
	import TodoList from './TodoList.svelte';

	const API_URL = 'http://localhost:3000/api/graphql';

	let token: string | null = $state(localStorage.getItem('keystonejs-session'));
	$effect(() => {
		if (token) localStorage.setItem('keystonejs-session', token);
	});

	class User {
		public id: string;
		public name: string;
		public email: string;
		public todos: Todo[] | null;

		constructor(name: string, email: string, todos?: Todo[]) {
			this.name = name;
			this.email = email;
			this.todos = todos || null;
		}
		toString() {
			return this.name;
		}
	}

	class Todo {
		public id: string;
		public description: string;
		public done: boolean;
		public assignee: User;

		constructor(id: string, description: string, done: boolean, assignee: User) {
			this.id = id;
			this.description = description;
			this.done = done;
			this.assignee = assignee;
		}
		toString() {
			return this.description;
		}
	}
	// loading est un état global qui indique si une opération asynchrone est en cours
	let loading: boolean = $state(false);
	// State global de l'application

	let todos: Todo[] = $derived(await GetTasks(token));
	let users: User[] = $derived(await GetUsers(token));

	let me: User | null = $derived(await getAuthedUser(token));
	let isConnected: boolean = $derived(!!me);

	let email: string = $state('');
	let password: string = $state('');

	let newTaskLabel: string = $state('');
	let newTaskUser: string = $state('');
	let newPassword: string = $state('');
	let showPassModal: boolean = $state(false);

	//Recupération des tâches et des utilisateurs depuis l'API GraphQL en utilisant le token pour l'authentification
	async function GetTasks(t): Promise<Todo[]> {
		let todos: Todo[] = [];
		if (!t) return [];
		const response = await fetch(API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${t}`
			},
			body: JSON.stringify({
				query: `query { tasks { id label isComplete assignedTo { name } } }`
			})
		});
		const result = await response.json();
		todos.push(
			...result.data.tasks.map((t) => ({
				id: t.id,
				description: t.label,
				done: t.isComplete,
				assignee: t.assignedTo?.name || null
			}))
		);
		return todos;
	}

	async function GetUsers(t): Promise<User[]> {
		let users: User[] = [];
		if (!t) return [];
		const response = await fetch(API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${t}`
			},
			body: JSON.stringify({
				query: `query { users { id name email } }`
			})
		});
		const result = await response.json();
		users.push(...result.data.users.map((u) => new User(u.name, u.email)));
		return users;
	}

	// Fonction pour verifier la validité du token et récupérer les infos utilisateur
	async function getAuthedUser(t) {
		if (!t) return null;
		try {
			const response = await fetch(API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${t}`
				},
				body: JSON.stringify({
					query: `query { authenticatedItem { ... on User { id name email } } }`
				})
			});
			const result = await response.json();
			const userData = result.data?.authenticatedItem;
			return userData ? new User(userData.name, userData.email) : null;
		} catch (err) {
			console.error("Erreur lors de la récupération de l'utilisateur authentifié :", err);
			return null;
		}
	}

	$inspect('Token actuel :', token);
	$inspect('Utilisateur connecté :', me);
	$inspect('Tâches chargées :', todos);
	$inspect('Utilisateurs chargés :', users);

	// Fonction de connexion qui envoie les identifiants à l'API et stocke le token en cas de succès
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
				localStorage.setItem('keystone_token', auth.sessionToken);
				localStorage.setItem('user_id', auth.item.id);
				token = auth.sessionToken;
				await GetTasks(token);
			} else {
				alert(auth.message || 'Email ou mot de passe incorrect');
			}
		} catch (err) {
			console.error('Erreur technique :', err);
		}
	}
	// Fonction de déconnexion qui supprime le token du localStorage et réinitialise les états
	function logout() {
		localStorage.removeItem('keystone_token');
		localStorage.removeItem('user_id');
		token = null;
		todos = [];
		users = [];
		me = null;
	}

	function add() {
		if (!newTaskLabel) return;
		fetch(API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				query: `mutation 
					CreateTask($label: String!,  $userId: ID) {
						createTask(data: { label: $label, isComplete: false, assignedTo: { connect: { id: $userId } } }) {
							id 
							label 
							isComplete 
							assignedTo { name }
						}
					}`,
				variables: {
					label: newTaskLabel,
					userId: newTaskUser || null
				}
			})
		});
		// Rafraichissement de la liste des tâches après l'ajout
		GetTasks(token).then((newTodos) => {
			todos = newTodos;
			newTaskLabel = '';
		});
	}

	function remove(todo) {
		fetch(API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				query: `mutation { deleteTask(where: { id: "${todo.id}" }) { id } }`
			})
		});
		// Rafraichissement de la liste des tâches après la suppression
		GetTasks(token).then((newTodos) => {
			todos = newTodos;
		});
	}

	function toggle(todo) {
		fetch(API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				query: `mutation ToggleTask($id: ID!, $done: Boolean!) {
					updateTask(where: { id: $id }, data: { isComplete: $done }) { id }
				}`,
				variables: { id: todo.id, done: !todo.done }
			})
		});
		// Rafraichissement de la liste des tâches après le toggle
		GetTasks(token).then((newTodos) => {
			todos = newTodos;
		});
	}

	function update(id, data) {
		fetch(API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				query: `mutation UpdateTask($id: ID!, $data: TaskUpdateInput!) {
					updateTask(where: { id: $id }, data: $data) { id }
				}`,
				variables: { id, data }
			})
		});
		// Rafraichissement de la liste des tâches après la mise à jour
		GetTasks(token).then((newTodos) => {
			todos = newTodos;
		});
	}

	function updatePassword() {
		if (!newPassword) return;
		fetch(API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				query: `mutation UpdatePassword($id: ID!, $password: String!) {
					updateUser(where: { id: $id }, data: { password: $password }) { id }
				}`,
				variables: { id: me.id, password: newPassword }
			})
		});
		showPassModal = false;
	}
</script>

{#if !isConnected}
	<div class="login-container">
		<h2>Connexion</h2>
		<input type="email" placeholder="Email" bind:value={email} />
		<input type="password" placeholder="Mot de passe" bind:value={password} />
		<button onclick={login}>Se connecter</button>
	</div>
{:else}
	<div class="app-container">
		<header>
			<h1>Ma Todo List</h1>
			<div class="user-info">
				<span>Connecté en tant que {me.name}</span>
				<button onclick={() => (showPassModal = true)}>Changer de mot de passe</button>
				<button onclick={logout}>Déconnexion</button>
			</div>
		</header>
		<main>
			<div class="add-task">
				<input type="text" placeholder="Nouvelle tâche..." bind:value={newTaskLabel} />
				<select bind:value={newTaskUser}>
					<option value="">Assigner à...</option>
					{#each users as user}
						<option value={user.id}>{user.name}</option>
					{/each}
				</select>
				<button onclick={add}>Ajouter</button>
			</div>

			<TodoList {todos} {users} {toggle} {remove} {update} />
		</main>
	</div>

	{#if showPassModal}
		<div class="modal">
			<div class="modal-content">
				<h3>Changer de mot de passe</h3>
				<input type="password" placeholder="Nouveau mot de passe" bind:value={newPassword} />
				<button onclick={updatePassword}>Valider</button>
				<button onclick={() => (showPassModal = false)}>Annuler</button>
			</div>
		</div>
	{/if}
{/if}
