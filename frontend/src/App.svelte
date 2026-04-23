<script lang="ts" module>
	export class User {
		public id: string;
		public name: string;
		public email: string;
		public todoIds: string[];

		constructor(id: string, name: string, email: string, todoIds: string[] = []) {
			this.id = id;
			this.name = name;
			this.email = email;
			this.todoIds = todoIds;
		}

		toString() {
			return this.name;
		}
	}

	export class Todo {
		public id: string;
		public description: string;
		public done: boolean;
		public assigneeId?: string;

		constructor(id: string, description: string, done: boolean, assigneeID: string) {
			this.id = id;
			this.description = description;
			this.done = done;
			this.assigneeId = assigneeID;
		}

		toString() {
			return this.description;
		}
	}
</script>

<script lang="ts">
	import TodoList from './TodoList.svelte';
	import Header from './Header.svelte';
	import Conexion from './Conexion.svelte';

	const API_URL = 'http://localhost:3000/api/graphql';

	let token: string | null = $state(localStorage.getItem('keystonejs-session'));
	$effect(() => {
		if (token) localStorage.setItem('keystonejs-session', token);
		else localStorage.removeItem('keystonejs-session');
	});

	let dependency = $state(1);
	$effect(() => {
		setInterval(() => dependency++, 30_000);
	});
	// State global de l'application

	let todos: Todo[] = $derived(await GetTasks(token));
	let users: User[] = $derived(await GetUsers(token));

	let me: User | null = $derived(await getAuthedUser(token));
	let isConnected: boolean = $derived(!!me);

	let email: string = $state('');
	let password: string = $state('');

	let newTaskLabel: string = $state('');
	let newTaskUser: string = $state(null);
	let isEditing = $state(false);

	//Recupération des tâches et des utilisateurs depuis l'API GraphQL en utilisant le token pour l'authentification
	async function GetTasks(token: string): Promise<Todo[]> {
		dependency;
		if (!token) return [];
		const response = await fetch(API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				query: `query { tasks { id label isComplete assignedTo { id } } }`
			})
		});
		const { data, errors } = await response.json();
		if (errors) throw errors;
		return data.tasks.map(
			(task) => new Todo(task.id, task.label, task.isComplete, task.assignedTo?.id)
		);
	}

	async function GetUsers(token: string): Promise<User[]> {
		dependency;
		if (!token) return [];
		const response = await fetch(API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				query: `query { users { id name email tasks { id } } }`
			})
		});
		const { data, errors } = await response.json();
		if (errors) throw errors;
		return data.users.map(
			(u) =>
				new User(
					u.id,
					u.name,
					u.email,
					u.tasks.map((task) => task.id)
				)
		);
	}

	// Fonction pour verifier la validité du token et récupérer les infos utilisateur
	async function getAuthedUser(token: string | null) {
		dependency;
		if (!token) return null;
		const response = await fetch(API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				query: `query { authenticatedItem { ... on User { id name email } } }`
			})
		});
		const result = await response.json();
		const userData = result.data?.authenticatedItem;
		return userData ? new User(userData.id, userData.name, userData.email) : null;
	}

	// Fonction de déconnexion qui met à null le token
	function logout() {
		token = null;
	}

	async function UpdateList(action: string, todo?: Todo, data?: any, id?: string) {
		switch (action) {
			case 'add':
				let newtodo = new Todo(crypto.randomUUID(), newTaskLabel, false, newTaskUser || null);
				console.log('Adding task:', newtodo);
				fetch(API_URL, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					},
					body: JSON.stringify({
						query: `mutation CreateTask($label: String!, $isComplete: Boolean!, $userId: ID) {
						createTask(data: { label: $label, isComplete: $isComplete, assignedTo: { connect: { id: $userId } } }) {
							id 
							label 
							isComplete 
							assignedTo { name }
						}
					}`,
						variables: {
							label: newtodo.description,
							isComplete: newtodo.done,
							userId: newtodo.assigneeId
						}
					})
				});
				break;
			case 'remove':
				try {
					fetch(API_URL, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${token}`
						},
						body: JSON.stringify({
							query: `mutation($id: ID) { deleteTask(where: { id: $id }) { id } }`,
							variables: { id: todo.id }
						})
					});
				} catch (e) {
					console.error('Error deleting task:', e);
				}
				break;
			case 'update':
				fetch(API_URL, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					},
					body: JSON.stringify({
						query: `mutation UpdateTask($id: ID!, $label: String, $isComplete: Boolean, $userId: ID) {
						updateTask(where: { id: $	id }, data: { label: $label, isComplete: $isComplete, assignedTo: { connect: { id: $userId } } }) {
							id 
							label 
							isComplete 
							assignedTo { name }
						}
					}`,
						variables: {
							id: todo.id,
							label: data.description,
							isComplete: data.done,
							userId: data.assigneeId
						}
					})
				});

			case 'toggle':
				fetch(API_URL, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					},
					body: JSON.stringify({
						query: `mutation ToggleTask($id: ID!, $isComplete: Boolean!) {
						updateTask(where: { id: $id }, data: { isComplete: $isComplete }) { id }
					}`,
						variables: { id, isComplete: data.done }
					})
				});
		}
		dependency++;
	}
</script>

{#if !isConnected}
	<Conexion {API_URL} {email} {password} bind:token bind:me />
{:else}
	<div class="app-container">
		<Header {me} onlogout={logout} />

		<main>
			<div class="add-task">
				<input type="text" placeholder="Nouvelle tâche" bind:value={newTaskLabel} />
				<p>Asigné à :</p>
				<select bind:value={newTaskUser}>
					{#each users as user}
						<option value={user.id}>{user.name}</option>
					{/each}
				</select>
				<button
					onclick={() => {
						if (newTaskLabel != '' && newTaskUser != '') {
							UpdateList('add', null, { description: newTaskLabel, assigneeId: newTaskUser });
							newTaskLabel = '';
							newTaskUser = '';
						} else {
							alert(
								'Veuillez entrer une description et sélectionner un utilisateur pour la tâche.'
							);
						}
					}}
				>
					Ajouter
				</button>
			</div>

			<TodoList {todos} {users} onUpdateList={UpdateList} bind:isEditing />

			{#if !isEditing}
				<button onclick={() => (isEditing = !isEditing)}> Modifier les tâches </button>
			{:else}
				<button onclick={() => (isEditing = !isEditing)}> Terminer la modification </button>
			{/if}
		</main>
	</div>
{/if}

<style>
	/* Variables de couleurs pour une maintenance facile */
	:root {
		--primary-color: #4f46e5;
		--primary-hover: #4338ca;
		--bg-color: #f9fafb;
		--card-bg: #ffffff;
		--text-main: #1f2937;
		--text-muted: #6b7280;
		--border-color: #e5e7eb;
		--shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}

	main {
		max-width: 600px;
		margin: 2rem auto;
		padding: 2rem;
		background-color: var(--card-bg);
		border-radius: 12px;
		box-shadow: var(--shadow);
		font-family:
			'Inter',
			system-ui,
			-apple-system,
			sans-serif;
	}

	/* Conteneur d'ajout de tâche */
	.add-task {
		display: flex;
		gap: 10px;
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 2px solid var(--bg-color);
	}

	/* Champs de saisie et Select */
	input[type='text'],
	select {
		padding: 0.6rem 1rem;
		border: 1px solid var(--border-color);
		border-radius: 8px;
		font-size: 0.95rem;
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
	}

	input[type='text'] {
		flex-grow: 2; /* Le champ texte prend plus de place */
	}

	select {
		flex-grow: 1;
		background-color: white;
		cursor: pointer;
	}

	input:focus,
	select:focus {
		outline: none;
		border-color: var(--primary-color);
		box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
	}

	/* Boutons */
	button {
		padding: 0.6rem 1.2rem;
		background-color: var(--primary-color);
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition:
			background-color 0.2s,
			transform 0.1s;
	}

	button:hover {
		background-color: var(--primary-hover);
	}

	button:active {
		transform: scale(0.98);
	}

	/* Bouton spécifique pour le mode édition (en bas) */
	main > button {
		width: 100%;
		margin-top: 1.5rem;
		background-color: transparent;
		color: var(--primary-color);
		border: 2px solid var(--primary-color);
	}

	main > button:hover {
		background-color: var(--primary-color);
		color: white;
	}
</style>
