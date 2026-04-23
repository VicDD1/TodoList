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

		constructor(id: string, description: string, done: boolean, assigneeID?: string) {
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
				console.log('Adding task:', newTaskLabel, 'assigned to user ID:', newTaskUser);
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
				//on créer un todo pour voir ce qu'il y a dans le todo pour le debug
				const updatedTodo = new Todo(todo.id, data.description, todo.done, data.assigneeId);
				console.log('Updating task:', updatedTodo);
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

	$inspect('Token actuel :', token);
	$inspect('Utilisateur connecté :', me);
	$inspect('Tâches chargées :', todos);
	$inspect('Utilisateurs chargés :', users);
	$inspect('dependency :', dependency);
	$inspect('isEditing :', isEditing);
</script>

{#if !isConnected}
	<Conexion {API_URL} {email} {password} bind:token bind:me />
{:else}
	<div class="app-container">
		<Header {me} onlogout={logout} />

		<main>
			<div class="add-task">
				<input
					type="text"
					placeholder="Nouvelle tâche"
					bind:value={newTaskLabel}
					onkeypress={(e) => {
						if (e.key === 'Enter') {
							UpdateList('add');
							newTaskLabel = '';
							newTaskUser = null;
						}
					}}
				/>
				<select bind:value={newTaskUser}>
					<option value="">Aucun</option>
					{#each users as user}
						<option value={user.id}>{user.name}</option>
					{/each}
				</select>
				<button
					onclick={() => {
						UpdateList('add');
						newTaskLabel = '';
						newTaskUser = null;
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
