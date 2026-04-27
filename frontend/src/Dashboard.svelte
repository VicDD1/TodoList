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
		public assigneeId?: string | null;

		constructor(id: string, description: string, done: boolean, assigneeID: string | null) {
			this.id = id;
			this.description = description;
			this.done = done;
			this.assigneeId = assigneeID || null;
		}

		toString() {
			return this.description;
		}
	}
</script>

<script lang="ts">
	import editIcon from './edit.svg';
	import doneIcon from './done.svg';
	import clearIcon from './clear-all.svg';
	import TodoList from './TodoList.svelte';
	import Header from './Header.svelte';
	import Conexion from './Conexion.svelte';
	import { safe, type AsyncResult } from '@terrygonguet/utils/result';

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
	let newTaskUser: string | null = $state(null);
	let isEditing = $state(false);
	let createTaskError = $state(null);
	let updateTaskError = $state(null);
	let removeTaskError = $state(null);

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
				(task) => new Todo(task.id, task.label, task.isComplete, task.assignedTo?.id || null)
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

	// Fonction de déconnexion qui met à null le token
	function logout() {
		token = null;
	}

	async function addTask(newTaskLabel: string, newTaskUser: string | null) {
		if (newTaskLabel == '')
			createTaskError = new Error('Veuillez entrer une description pour la tâche.');
		try {
			await gqlQuery2({
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
						assignedTo: newTaskUser ? { connect: { id: newTaskUser } } : null
					}
				}
			});
		} catch (error) {
			createTaskError = error;
		} finally {
			dependency.todo++;
		}
	}

	async function removeTask(todo: Todo) {
		try {
			await gqlQuery2({
				token,
				query: `mutation($id: ID) { deleteTask(where: { id: $id }) { id } }`,
				variables: { id: todo.id }
			});
		} catch (error) {
			removeTaskError = error;
		} finally {
			dependency.todo++;
		}
	}

	async function UpdateTask(todo?: Todo) {
		try {
			await gqlQuery2({
				token,

				query: `mutation UpdateTask($id: ID!, $label: String, $isComplete: Boolean, $userId: UserRelateToOneForUpdateInput) {
					updateTask(where: { id: $	id }, data: { label: $label, isComplete: $isComplete, assignedTo: $userId}) {
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
					userId: todo.assigneeId ? { connect: { id: todo.assigneeId } } : { disconnect: true }
				}
			});
		} catch (error) {
			updateTaskError = error;
		} finally {
			dependency.todo++;
		}
	}

	function ToggleTask(todo: Todo) {
		todo.done = !todo.done;
		return UpdateTask(todo);
	}

	async function DeleteAllDone() {
		const doneTasks = todos.filter((todo) => todo.done);
		for (const todo of doneTasks) {
			await removeTask(todo);
		}
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
		return fetch(API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({ query, variables })
		})
			.then(
				(response) => response.json(),
				(error) => new Error('Netwok error', { cause: error })
			)
			.then(
				({ data, errors }) => {
					if (errors) throw new Error('API errors lol', { cause: errors });
					else return data;
				},
				(error) => new Error('wtf?', { cause: error })
			);
	}

	function gqlQuery2<T>({
		token,
		query,
		variables
	}: {
		token: string;
		query: string;
		variables?: any;
	}): AsyncResult<Error, T> {
		return safe(() =>
			fetch(API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({ query, variables })
			})
		)
			.recover((error) => {
				throw new Error('Netwok error', { cause: error });
			})
			.andThen((response) => response.json())
			.recover((error) => {
				throw new Error('wtf?', { cause: error });
			})
			.andThen(({ data, errors }) => {
				if (errors) throw new Error('API errors lol', { cause: errors });
				else return data;
			});
	}

	$inspect(todos);
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
					<option value={null}>Non assigné</option>
					{#each users as user}
						<option value={user.id}>{user.name}</option>
					{/each}
				</select>
				<button
					onclick={() => {
						addTask(newTaskLabel, newTaskUser).then(() => {
							newTaskLabel = '';
							newTaskUser = null;
						});
					}}
				>
					Ajouter
				</button>

				{#if createTaskError}
					<p class="error">{createTaskError.message}</p>
					<button onclick={() => (createTaskError = null)}>ok</button>
				{/if}
			</div>

			<TodoList
				{todos}
				{users}
				{isEditing}
				onToggleTodo={(todo) => ToggleTask(todo)}
				onUpdateTodo={(todo) => UpdateTask(todo)}
				onDelete={removeTask}
				bind:updateTaskError
				bind:removeTaskError
			/>

			<button onclick={() => (isEditing = !isEditing)}>
				{#if !isEditing}
					<img src={editIcon} alt="Modifier" />
				{:else}
					<img src={doneIcon} alt="Terminer la modification" />
				{/if}
			</button>
			<button onclick={DeleteAllDone}>
				<img src={clearIcon} alt="Supprimer toutes les tâches terminées" />
			</button>
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
