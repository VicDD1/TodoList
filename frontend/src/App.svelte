<script lang="ts">
	import { onMount } from 'svelte';
	import TodoList from './TodoList.svelte';

	const API_URL = 'http://localhost:3000/api/graphql';

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
	}

	class Todo {
		public id: string;
		public description: string;
		public done: boolean;
		public assignee: User;

		constructor(description: string, done: boolean, assignee: User) {
			this.description = description;
			this.done = done;
			this.assignee = assignee;
		}
	}

	// State global de l'application
	let todos: Todo[] = $state([]);
	let loading: boolean = $state(false);

	let token: string | null = $state(localStorage.getItem('keystone_token'));
	$effect(() => {
		if (token) localStorage.setItem('keystone_token', token);
	});
	let me: User | null = $derived(await getAuthedUser(token));
	let isConnected: boolean = $derived(!!me);

	let newTaskLabel: string = $state('');
	let newTaskUser: string = $state('');
	let newPassword: string = $state('');
	let showPassModal: boolean = $state(false);

	// Dérivés pour faciliter l'accès aux données utilisateur
	let email: string = $derived(getPayload(token).email || '');
	let password: string = $derived(getPayload(token).password || '');

	// Fonction utilitaire pour décoder le token JWT et extraire les données utiles
	function getPayload(t) {
		if (!t) return {};
		try {
			return JSON.parse(atob(t.split('.')[1]));
		} catch {
			return {};
		}
	}
	//verification de la validité du token et récupération des infos utilisateur

	async function getAuthedUser(t) {
		if (!token) return null;
		try {
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
		} catch (err) {
			console.error("Erreur lors de la récupération de l'utilisateur authentifié :", err);
			return null;
		}
	}

	// Récupération de la liste des utilisateurs pour l'assignation des tâches
	let users = $state([]);
	onMount(async () => {
		if (token) {
			const response = await fetch(API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					query: `query { users { id name } }`
				})
			});
			const result = await response.json();
			users = result.data.users;
		}
	});

	// Chargement initial des tâches si l'utilisateur est déjà connecté
	onMount(async () => {
		if (token) {
			await fetchTasks();
		}
	});

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
					variables: { email, password }
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
				await fetchTasks();
			} else {
				alert(auth.message || 'Email ou mot de passe incorrect');
			}
		} catch (err) {
			console.error('Erreur technique :', err);
		}
	}
	// Fonction de déconnexion qui nettoie le token et les données utilisateur
	function logout() {
		localStorage.removeItem('keystone_token');
		localStorage.removeItem('user_id');
		token = '';
		todos = [];
	}

	// Fonctions pour interagir avec l'API GraphQL pour les tâches (fetch, toggle, add, update, remove)
	async function fetchTasks() {
		loading = true;
		try {
			const response = await fetch(API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					query: `query { tasks { id label isComplete assignedTo { id name } } }`
				})
			});
			const result = await response.json();
			return result.data.tasks;
		} finally {
			loading = false;
		}
	}
	async function toggle(todo) {
		todo.done = !todo.done;
		await fetch(API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				query: `mutation UpdateTask($id: ID!, $done: Boolean!) {
          updateTask(where: { id: $id }, data: { isComplete: $done }) { id }
        }`,
				variables: { id: todo.id, done: todo.done }
			})
		});
	}

	async function add() {
		if (!newTaskLabel) return;
		const response = await fetch(API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				query: `mutation CreateTask($label: String!,  $userId: ID) {
          createTask(data: { label: $label, isComplete: false, assignedTo: { connect: { id: $userId } } }) {
            id label isComplete assignedTo { name }
          }
        }`,
				variables: {
					label: newTaskLabel,
					userId: newTaskUser || null
				}
			})
		});
		const result = await response.json();
		const newTask = result.data?.createTask;
		if (newTask) {
			todos = [
				...todos,
				{
					id: newTask.id,
					done: newTask.isComplete,
					description: newTask.label,
					assignee: newTask.assignedTo?.name
				}
			];
			newTaskLabel = '';
		}
	}

	async function update(todo) {
		const newLabel = prompt('Nouvelle description', todo.description);
		if (newLabel === null) return; // Annulé
		todo.description = newLabel;
		await fetch(API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				query: `mutation UpdateTask($id: ID!, $label: String!) {
		  updateTask(where: { id: $id }, data: { label: $label }) { id }
		}`,
				variables: { id: todo.id, label: todo.description }
			})
		});
	}

	async function remove(todo) {
		await fetch(API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				query: `mutation { deleteTask(where: { id: "${todo.id}" }) { id } }`
			})
		});
		todos = todos.filter((t) => t.id !== todo.id);
	}

	// Fonction pour mettre à jour le mot de passe de l'utilisateur connecté
	async function updateMyPassword() {
		const userId = localStorage.getItem('user_id');
		await fetch(API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				query: `mutation($id: ID!, $password: String!) {
          updateUser(where: { id: $id }, data: { password: $password }) { id }
        }`,
				variables: { id: userId, password: newPassword }
			})
		});
		showPassModal = false;
		newPassword = '';
	}
</script>
