<script lang="ts" module>
	export class User {
		public id: string;
		public name: string;
		public email: string;
		public todoIds: string[];

		constructor(name: string, email: string, todoIds: string[] = []) {
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

		getAssignee(users: User[]) {
			return users.find((user) => user.id == this.assigneeId);
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

	let dependency = $state({ num: 0 });
	$effect(() => {
		setInterval(() => dependency.num++, 30_000);
	});
	// State global de l'application

	let todos: Todo[] = $derived(dependency && (await GetTasks(token)));
	let users: User[] = $derived(dependency && (await GetUsers(token)));

	let me: User | null = $derived(dependency && (await getAuthedUser(token)));
	let isConnected: boolean = $derived(!!me);

	let email: string = $state('');
	let password: string = $state('');

	let newTaskLabel: string = $state('');
	let newTaskUser: string = $state('');

	//Recupération des tâches et des utilisateurs depuis l'API GraphQL en utilisant le token pour l'authentification
	async function GetTasks(token: string): Promise<Todo[]> {
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
					u.name,
					u.email,
					u.tasks.map((task) => task.id)
				)
		);
	}

	// Fonction pour verifier la validité du token et récupérer les infos utilisateur
	async function getAuthedUser(token: string | null) {
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
		return userData ? new User(userData.name, userData.email) : null;
	}

	// Fonction de déconnexion qui met à null le token
	function logout() {
		token = null;
	}

	async function UpdateList(action: string, todo?: Todo, data?: any, id?: string) {
		if (action == 'add') {
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
		} else if (action == 'remove') {
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
		} else if (action == 'update' || action == 'toggle') {
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
		} else {
			console.error('Action inconnue :', action);
			return;
		}
		dependency.num++;
	}

	$inspect('Token actuel :', token);
	$inspect('Utilisateur connecté :', me);
	$inspect('Tâches chargées :', todos);
	$inspect('Utilisateurs chargés :', users);
</script>

{#if !isConnected}
	<Conexion {API_URL} {email} {password} bind:token bind:me />
{:else}
	<div class="app-container">
		<Header {me} onlogout={logout} />

		<main>
			<div class="add-task">
				<input type="text" placeholder="Nouvelle tâche..." bind:value={newTaskLabel} />
				<select bind:value={newTaskUser}>
					<option value="">Assigner à...</option>
					{#each users as user}
						<option value={user.id}>{user.name}</option>
					{/each}
				</select>
				<button onclick={(e: any) => UpdateList('add')}>Ajouter</button>
			</div>

			<TodoList {todos} {users} onUpdateList={UpdateList} />
		</main>
	</div>
{/if}
