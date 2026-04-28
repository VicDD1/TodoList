<script lang="ts">
	import { type Todo, type User } from './Dashboard.svelte';
	import removeIcon from './remove.svg';
	import { flip } from 'svelte/animate';

	interface Props {
		todos: Todo[];
		users: User[];
		onUpdateTodo(todo: Todo): void;
		onToggleTodo(todo: Todo): void;
		onDelete(todo: Todo): void;
		updateTaskError?: Error;
		removeTaskError?: Error;
	}

	let {
		todos,
		users,
		onUpdateTodo,
		onToggleTodo,
		onDelete,
		updateTaskError = $bindable(),
		removeTaskError = $bindable()
	}: Props = $props();

	let editingId = $state(null);

	//on vérifie que le user.id correspond à todo.assigneeId et on affiche le nom du user
	function getAssigneeName(todo: Todo) {
		const assignee = users.find((user) => user.id === todo.assigneeId);
		return assignee ? assignee.name : 'Non assigné';
	}

	function handleExit(todo) {
		editingId = null;
		onUpdateTodo(todo);
	}

	let sortedTodos = $derived(todos.toSorted((a, b) => Number(a.done) - Number(b.done)));
	let indexOfFirstDone = $derived(sortedTodos.findIndex((todo) => todo.done));
</script>

<ul class="todo-list">
	{#each sortedTodos as todo, i (todo.id)}
		<li
			class:done={todo.done}
			animate:flip={{ duration: 400, delay: 100 * (i - indexOfFirstDone) }}
		>
			<div class="task-info">
				<input type="checkbox" checked={todo.done} onchange={() => onToggleTodo(todo)} />
				{#if editingId === todo.id}
					<!-- svelte-ignore a11y_autofocus -->
					<input
						type="text"
						bind:value={todo.description}
						autofocus
						onkeydown={(e) => e.key === 'Enter' && handleExit(todo)}
						class="edit-input"
					/>

					<select
						bind:value={todo.assigneeId}
						onkeydown={(e) => e.key === 'Enter' && handleExit(todo)}
					>
						<option value="">Non assigné</option>
						{#each users as user}
							<option value={user.id}>{user.name}</option>
						{/each}
					</select>
				{:else}
					<button
						type="button"
						class="invisible-button label"
						onclick={() => (editingId = todo.id)}
					>
						{todo.description}
					</button>

					<button
						type="button"
						class="invisible-button assignee"
						onclick={() => (editingId = todo.id)}
					>
						({getAssigneeName(todo)})
					</button>
				{/if}
			</div>
			<div class="task-actions">
				<button onclick={() => onDelete(todo)}>
					<img src={removeIcon} alt="Supprimer" />
				</button>
			</div>
		</li>
	{/each}
	{#if updateTaskError || removeTaskError}
		<div class="error">
			<p>{updateTaskError?.message || removeTaskError?.message}</p>
			<button
				onclick={() => {
					updateTaskError = null;
					removeTaskError = null;
				}}>ok</button
			>
		</div>
	{/if}
</ul>

<style>
	.todo-list {
		list-style: none;
		padding: 0;
		margin: 1.5rem 0;
	}

	/* Ligne de tâche */
	li {
		background: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		margin-bottom: 12px;
		padding: 0.75rem 1rem; /* On réduit un peu le padding vertical */
		display: flex; /* Active le flex sur la ligne */
		align-items: center; /* Aligne verticalement au centre */
		justify-content: space-between; /* Pousse le bouton supprimer à droite */
		gap: 15px;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
	}

	/* Infos de la tâche */
	.task-info {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-grow: 1; /* Prend toute la place disponible à gauche */
		min-width: 0; /* Empêche le texte de déborder */
	}
	.task-info input[type='checkbox'] {
		width: 18px;
		height: 18px;
		cursor: pointer;
		accent-color: #4f46e5;
	}

	.label {
		flex-grow: 1;
		overflow: hidden;
		text-overflow: ellipsis; /* Coupe le texte proprement s'il est trop long */
		white-space: nowrap;
	}

	.done .label {
		text-decoration: line-through;
		color: #9ca3af;
	}

	.invisible-button {
		background: none;
		border: none;
		padding: 0;
		margin: 0;
		font: inherit; /* Reprend la police du parent */
		color: inherit;
		cursor: pointer;
		text-align: left;
	}

	.invisible-button:hover {
		text-decoration: underline; /* Optionnel : aide à comprendre que c'est cliquable */
	}
	/* Badge Assignee */
	.assignee {
		font-size: 0.75rem;
		padding: 4px 10px;
		background-color: #eef2ff;
		color: #4338ca;
		border-radius: 20px;
		font-weight: 600;
		border: 1px solid #dbeafe;
		white-space: nowrap; /* Empêche le badge de revenir à la ligne */
		flex-shrink: 0; /* Empêche le badge de s'écraser */
	}

	.task-actions {
		display: flex;
		align-items: center;
		margin-top: 0; /* ON ENLÈVE LE MARGIN NÉGATIF ICI */
		flex-shrink: 0;
	}

	.task-actions button {
		background-color: #fef2f2;
		border: 1px solid #fee2e2;
		padding: 8px;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.task-actions button img {
		width: 18px;
		height: 18px;
		/* Si ton SVG est noir, tu peux utiliser filter pour le colorer en rouge */
		/* filter: invert(39%) sepia(85%) saturate(1500%) hue-rotate(337deg) brightness(98%) contrast(90%); */
	}

	.task-actions button:hover {
		background-color: #fee2e2;
		border-color: #fecaca;
	}

	/* Gestion des erreurs dans l'édition */
	.error {
		flex: 1 0 100%;
		color: #ef4444;
		font-size: 0.85rem;
		margin: 8px 0 0 0;
		padding: 8px 12px;
		background-color: #fef2f2;
		border-left: 4px solid #ef4444;
		border-radius: 4px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
</style>
