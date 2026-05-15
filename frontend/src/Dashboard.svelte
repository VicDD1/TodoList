<script lang="ts" module>
	export class User {
		public id: string;
		public name: string;
		public email: string;
		public taskIds: string[];

		constructor(id: string, name: string, email: string, taskIds: string[] = []) {
			this.id = id;
			this.name = name;
			this.email = email;
			this.taskIds = taskIds;
		}

		toString() {
			return this.name;
		}
	}

	export class Task {
		public id: string;
		public description: string;
		public done: boolean;
		public assigneeId: string | null;

		constructor(id: string, description: string, done: boolean, assigneeID: string | null) {
			this.id = id;
			this.description = description;
			this.done = done;
			this.assigneeId = assigneeID || null;
		}

		clone() {
			return new Task(this.id, this.description, this.done, this.assigneeId);
		}

		toString() {
			return this.description;
		}
	}
</script>

<script lang="ts">
	import clearIcon from './clear-all.svg';
	import TodoList from './TodoList.svelte';
	import Header from './Header.svelte';
	import Conexion from './Conexion.svelte';
	import { safe, type AsyncResult } from '@terrygonguet/utils/result';
	import { untrack } from 'svelte';

	const API_URL = import.meta.env.VITE_API_URL;

	let token: string | null = $state(localStorage.getItem('keystonejs-session'));
	$effect(() => {
		if (token) localStorage.setItem('keystonejs-session', token);
		else localStorage.removeItem('keystonejs-session');
	});

	$effect(() => {
		const sseUrl = import.meta.env.VITE_SSE_URL;
		const eventSource = new EventSource(sseUrl);

		eventSource.addEventListener('TASK_CREATED', (event) => {
			const data = JSON.parse(event.data);
			if (!tasks.some((t) => t.id === data.id)) {
				const newTask = new Task(data.id, data.label, data.isComplete, data.assignedToId || null);
				tasks = [...tasks, newTask];
			}
		});

		eventSource.addEventListener('TASK_DELETED', (event) => {
			const data = JSON.parse(event.data);
			const targetId = typeof data === 'object' ? data.id : data;
			tasks = tasks.filter((task) => task.id !== targetId);
		});

		eventSource.addEventListener('TASK_CHANGED', (event) => {
			const data = JSON.parse(event.data);
			const idx = tasks.findIndex((t) => t.id === data.id);
			if (idx !== -1) {
				tasks = tasks.with(
					idx,
					new Task(data.id, data.label, data.isComplete, data.assignedToId || null)
				);
			}
		});

		eventSource.addEventListener('USER_CREATED', (event) => {
			const data = JSON.parse(event.data);
			if (!users.some((u) => u.id === data.id)) {
				users = [...users, new User(data.id, data.name, data.email)];
			}
		});

		eventSource.addEventListener('USER_DELETED', (event) => {
			const data = JSON.parse(event.data);
			const targetUserId = typeof data === 'object' ? data.id : data;
			users = users.filter((user) => user.id !== targetUserId);
		});

		return () => {
			eventSource.close();
		};
	});

	let tasks = $state<Task[]>([]);
	let users = $state<User[]>([]);
	let me = $state<User | null>(null);
	let isConnected: boolean = $derived(!!me);

	let email: string = $state('');
	let password: string = $state('');

	let newTaskLabel: string = $state('');
	let newTaskUser: string | null = $state(null);

	let createTaskError = $state<Error | null>(null);
	let updateTaskError = $state<Error | null>(null);
	let removeTaskError = $state<Error | null>(null);

	$effect(() => {
		if (token) {
			getData(token).then((data) => {
				untrack(() => {
					tasks = data.tasks;
					users = data.users;
					me = data.me;
				});
			});
		} else {
			tasks = [];
			users = [];
			me = null;
		}
	});

	async function getData(token: string | null) {
		if (!token) return { tasks: [], users: [], me: null };

		const result = await gqlQuery2<{ tasks: any[]; users: any[]; me: any }>({
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
		const [error, data] = result.asTuple();
		if (error) throw error;

		return {
			tasks: data.tasks.map(
				(task: any) => new Task(task.id, task.label, task.isComplete, task.assignedTo?.id || null)
			),
			users: data.users.map(
				(u) =>
					new User(
						u.id,
						u.name,
						u.email,
						u.tasks.map((task: Task) => task.id)
					)
			),
			me: data.me ? new User(data.me.id, data.me.name, data.me.email) : null
		};
	}

	function logout() {
		token = null;
	}

	async function addTask(newTaskLabel: string, newTaskUser: string | null) {
		if (!token) return;
		if (newTaskLabel == '')
			createTaskError = new Error('Veuillez entrer une description pour la tâche.');

		await gqlQuery2({
			token,
			query: `mutation CreateTask($input: TaskCreateInput!) { createTask(data: $input) { id } }`,
			variables: {
				input: {
					label: newTaskLabel,
					isComplete: false,
					assignedTo: newTaskUser ? { connect: { id: newTaskUser } } : null
				}
			}
		}).match(
			(data) => {},
			(error) => {
				createTaskError = error;
			}
		);
	}

	async function removeTask(todo: Task) {
		if (!token) return;
		const [error, data] = await gqlQuery2({
			token,
			query: `mutation($id: ID) { deleteTask(where: { id: $id }) { id } }`,
			variables: { id: todo.id }
		}).asTuple();
		if (error) removeTaskError = error;
	}

	async function UpdateTask(todo: Task) {
		if (!token) return;
		const newTodo = todo.clone();
		const idx = tasks.findIndex((todo) => todo.id == newTodo.id);
		if (idx != -1) tasks = tasks.with(idx, newTodo);
		const [error, data] = await gqlQuery2<{ updateTask: any }>({
			token,
			query: `
				mutation UpdateTask($id: ID!, $data: TaskUpdateInput!) {
					updateTask(where: { id: $id }, data: $data) {
						id label isComplete assignedTo { id }
					}
				}`,
			variables: {
				id: todo.id,
				data: {
					label: todo.description,
					isComplete: todo.done,
					assignedTo: todo.assigneeId ? { connect: { id: todo.assigneeId } } : { disconnect: true }
				}
			}
		}).asTuple();
		if (error) updateTaskError = error;
	}

	function ToggleTask(todo: Task) {
		todo.done = !todo.done;
		return UpdateTask(todo);
	}

	async function DeleteAllDone() {
		if (!token) return;

		const idsToDelete = tasks.filter((todo) => todo.done).map((todo) => ({ id: todo.id }));
		const [error, data] = await gqlQuery2({
			token,
			query: `
            mutation($where: [TaskWhereUniqueInput!]!) {
                deleteTasks(where: $where) {
                    id
                }
            }
        `,
			variables: {
				where: idsToDelete
			}
		}).asTuple();

		if (error) {
			removeTaskError = error;
			console.error(removeTaskError);
		}
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

	$inspect('task :', tasks);
	$inspect('user :', users);
	$inspect('token :', token);
	$inspect('me :', me);
</script>

{#if !isConnected}
	<Conexion {email} {password} bind:token bind:me />
{:else}
	<div class="app-container">
		<Header {me} onlogout={logout} />

		<main>
			<form onsubmit={(evt) => evt.preventDefault()} class="add-task">
				<input type="text" placeholder="Nouvelle tâche" bind:value={newTaskLabel} />
				<label for="assigned-to">Asigné à :</label>
				<select id="assigned-to" bind:value={newTaskUser}>
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
			</form>

			<TodoList
				{tasks}
				{users}
				onToggleTask={(task) => ToggleTask(task)}
				onUpdateTask={(task) => UpdateTask(task)}
				onDelete={removeTask}
				bind:updateTaskError
				bind:removeTaskError
			/>

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

	button:active {
		transform: translateY(0);
	}

	main > button {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		margin: 1.5rem auto 0 auto;
		display: flex;
		box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3);
	}

	main > button img {
		width: 24px;
		height: 24px;
		filter: brightness(0) invert(1);
	}

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
