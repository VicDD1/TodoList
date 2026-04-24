<script lang="ts">
	import { type Todo } from './Dashboard.svelte';
	import removeIcon from './remove.svg';

	let {
		todos,
		users,
		isEditing,
		onUpdateTodo,
		onToggleTodo,
		onDelete,
		updateTaskError = $bindable(),
		removeTaskError = $bindable()
	} = $props();

	//on vérifie que le user.id correspond à todo.assigneeId et on affiche le nom du user
	function getAssigneeName(todo: Todo) {
		const assignee = users.find((user) => user.id === todo.assigneeId);
		return assignee ? assignee.name : 'Non assigné';
	}
</script>

<ul class="todo-list">
	{#each todos as todo}
		<li class:done={todo.done}>
			<div class="task-info">
				<input type="checkbox" checked={todo.done} onchange={() => onToggleTodo(todo)} />
				<span class="label">{todo.description}</span>

				<span class="assignee">{getAssigneeName(todo)}</span>
			</div>
			<div class="task-actions">
				<button onclick={() => onDelete(todo)}>
					<img src={removeIcon} alt="Supprimer" />
				</button>
			</div>

			<!--sur le clic on affiche un formulaire de modification-->

			{#if isEditing}
				<div class="edit-form">
					<input type="text" bind:value={todo.description} />
					<select bind:value={todo.assigneeId}>
						<option value={users[0].id}>{users[0].name}</option>
						{#each users.slice(1) as user}
							<option value={user.id}>{user.name}</option>
						{/each}
					</select>
					<button onclick={() => onUpdateTodo(todo)}>Enregistrer</button>
				</div>
			{/if}
			{#if updateTaskError}
				<p class="error">{updateTaskError.message}</p>
				<button onclick={() => (updateTaskError = null)}>ok</button>
			{/if}
			{#if removeTaskError}
				<p class="error">{removeTaskError.message}</p>
				<button onclick={() => (removeTaskError = null)}>ok</button>
			{/if}
		</li>
	{/each}
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

	li:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
		transform: translateY(-1px);
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

	/* Formulaire d'édition */
	.edit-form {
		width: 100%;
		display: flex;
		flex-basis: 100%;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 15px;
		padding-top: 15px;
		border-top: 1px dashed #e5e7eb;
	}

	.edit-form input,
	.edit-form select {
		padding: 6px 12px;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.9rem;
		background-color: #f9fafb;
	}

	.edit-form button {
		background-color: #10b981;
		color: white;
		padding: 6px 15px;
		border: none;
		border-radius: 6px;
		font-weight: 600;
		cursor: pointer;
	}

	.edit-form button:hover {
		background-color: #059669;
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
