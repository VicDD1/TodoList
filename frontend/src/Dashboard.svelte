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

	let dependency = $state({ todo: 1, user: 1, auth: 1 });
	$effect(() => {
		setInterval(() => {
			dependency.todo++;
			dependency.user++;
			dependency.auth++;
		}, 30_000);
	});

	// State global de l'application
	let { todos, users, me } = $derived(await getData(token));
	let isConnected: boolean = $derived(!!me);

	let email: string = $state('');
	let password: string = $state('');

	let newTaskLabel: string = $state('');
	let newTaskUser: string = $state(null);
	let isEditing = $state(false);
	let createTaskError = $state(null);

	async function getData(token: string) {
		dependency.todo;
		dependency.user;
		dependency.auth;
		const data = await gqlQuery<{ tasks: any[]; users: any[]; me: any }>({
			token,
			query: `query {
				tasks { id label isComplete assignedTo { id } }
				users { ...user }
				me: authenticatedItem { ...user }
			}
			fragment user on User {
				id name email tasks { id }
			}`
		});

		return {
			todos: data.tasks.map(
				(task) => new Todo(task.id, task.label, task.isComplete, task.assignedTo?.id)
			),
			users: data.users.map(
				(u) =>
					new User(
						u.id,
						u.name,
						u.email,
						u.tasks.map((task) => task.id)
					)
			),
			me: data.me ? new User(data.me.id, data.me.name, data.me.email) : null
		};
	}

	//Recupération des tâches et des utilisateurs depuis l'API GraphQL en utilisant le token pour l'authentification
	async function GetTasks(token: string): Promise<Todo[]> {
		dependency.todo;
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
		dependency.user;
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
		dependency.auth;
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

	async function addTask() {
		await gqlQuery({
			token,
			query: `mutation CreateTask($input: TaskCreateInput!) {
						createTask(data: $input) {
							id
							label
							isComplete
							assignedTo { name }
						}
					}`,
			variables: {
				input: {
					label: newTaskLabel,
					isComplete: false,
					assignedTo: newTaskUser ? { connect: { id: newTaskUser } } : undefined
				}
			}
		});
	}

	async function removeTask(todo: Todo) {
		await gqlQuery({
			token,
			query: `mutation($id: ID) { deleteTask(where: { id: $id }) { id } }`,
			variables: { id: todo.id }
		});
	}

	async function UpdateTask(action: string, todo?: Todo) {
		switch (action) {
			case 'update':
				await gqlQuery({
					token,
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
						label: todo.description,
						isComplete: todo.done,
						userId: todo.assigneeId
					}
				});

				break;
			case 'toggle':
				todo.done = !todo.done;
				await UpdateTask('update', todo);
				break;
		}
		dependency.todo++;
	}

	async function gqlQuery<T>({
		token,
		query,
		variables
	}: {
		token: string;
		query: string;
		variables?: any;
	}): Promise<T> {
		const response = await fetch(API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({ query, variables })
		});
		const { data, errors } = await response.json();
		if (errors) throw errors;
		else return data;
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
							addTask().then(
								() => {
									newTaskLabel = '';
									newTaskUser = '';
								},
								(err) => (createTaskError = err)
							);
						} else {
							createTaskError = new Error(
								'Veuillez entrer une description et sélectionner un utilisateur pour la tâche.'
							);
						}
					}}
				>
					Ajouter
				</button>

				{#if createTaskError}
					<p class="error">{createTaskError.message}</p>
					<button onclick={() => (createTaskError = null)}>ok</button>
				{/if}
			</div>

			<TodoList {todos} {users} onUpdateList={UpdateTask} onDelete={removeTask} bind:isEditing />

			{#if !isEditing}
				<button onclick={() => (isEditing = !isEditing)}>
					<img src="edit.svg" alt="Modifier" /></button
				>
			{:else}
				<button onclick={() => (isEditing = !isEditing)}>
					<img src="done.svg" alt="Terminer la modification" />
				</button>
			{/if}
		</main>
	</div>
{/if}

<style>
	:root {
		--primary-color: #4f46e5;
		--primary-hover: #4338ca;
		--bg-color: #f9fafb;
		--card-bg: #ffffff;
		--text-main: #1f2937;
		--text-muted: #6b7280;
		--error-color: #ef4444;
		--border-color: #e5e7eb;
		--shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
	}

	main {
		max-width: 650px;
		margin: 3rem auto;
		padding: 2rem;
		background-color: var(--card-bg);
		border-radius: 16px;
		box-shadow: var(--shadow);
		font-family: 'Inter', system-ui, sans-serif;
	}

	/* Barre d'ajout de tâche */
	.add-task {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
		margin-bottom: 2rem;
		padding: 1.25rem;
		background-color: var(--bg-color);
		border-radius: 12px;
		border: 1px solid var(--border-color);
	}

	.add-task p {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-muted);
	}

	input[type='text'],
	select {
		padding: 0.6rem 1rem;
		border: 1px solid var(--border-color);
		border-radius: 8px;
		font-size: 0.95rem;
		background-color: white;
		transition: all 0.2s;
	}

	input[type='text'] {
		flex: 2 1 200px;
	}

	select {
		flex: 1 1 120px;
	}

	input:focus,
	select:focus {
		outline: none;
		border-color: var(--primary-color);
		box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
	}

	/* Boutons Génériques */
	button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 0.6rem 1.2rem;
		background-color: var(--primary-color);
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	button:hover {
		background-color: var(--primary-hover);
		transform: translateY(-1px);
	}

	button:active {
		transform: translateY(0);
	}

	/* Bouton flottant/principal pour l'édition (le gros bouton en bas) */
	main > button {
		width: 60px; /* Format circulaire pour les icônes */
		height: 60px;
		border-radius: 50%;
		margin: 1.5rem auto 0 auto;
		display: flex;
		box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3);
	}

	main > button img {
		width: 24px;
		height: 24px;
		filter: brightness(0) invert(1); /* Rend l'icône blanche */
	}

	/* Zone d'erreur */
	.error {
		flex: 1 0 100%;
		color: var(--error-color);
		font-size: 0.85rem;
		margin: 8px 0 0 0;
		padding: 10px 14px;
		background-color: #fef2f2;
		border-left: 4px solid var(--error-color);
		border-radius: 6px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
</style>
