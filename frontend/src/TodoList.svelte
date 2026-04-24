<script lang="ts">
	import { type Todo } from './Dashboard.svelte';

	let { todos, users, onUpdateList, isEditing = $bindable() } = $props();

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
				<input
					type="checkbox"
					checked={todo.done}
					onchange={() => onUpdateList('update', todo, { done: !todo.done }, todo.id)}
				/>

				<span class="label">{todo.description}</span>

				<span class="assignee">{getAssigneeName(todo)}</span>
			</div>
			<div class="task-actions">
				<button onclick={() => onUpdateList('remove', todo)}>Supprimer</button>
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
					<button
						onclick={() => {
							onUpdateList(
								'update',
								todo,
								{ description: todo.description, assigneeId: todo.assigneeId },
								todo.id
							);
						}}>Enregistrer</button
					>
				</div>
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

	/* Style de chaque ligne de tâche */
	li {
		background: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 10px;
		margin-bottom: 12px;
		padding: 1rem;
		transition: all 0.2s ease;
	}

	li:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
		border-color: #d1d5db;
	}

	/* Alignement des éléments principaux */
	.task-info {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.task-info input[type='checkbox'] {
		width: 18px;
		height: 18px;
		cursor: pointer;
		accent-color: #4f46e5;
	}

	.label {
		flex-grow: 1;
		font-size: 1rem;
		color: #1f2937;
		transition: color 0.3s;
	}

	/* Badge pour la personne assignée */
	.assignee {
		font-size: 0.75rem;
		padding: 4px 8px;
		background-color: #eef2ff;
		color: #4338ca;
		border-radius: 20px;
		font-weight: 500;
	}

	/* Actions (Bouton supprimer) */
	.task-actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 8px;
	}

	.task-actions button {
		background-color: #fee2e2;
		color: #ef4444;
		padding: 4px 10px;
		font-size: 0.8rem;
	}

	.task-actions button:hover {
		background-color: #fecaca;
	}

	/* Formulaire d'édition (s'affiche sous la tâche) */
	.edit-form {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px dashed #d1d5db;
	}

	.edit-form input,
	.edit-form select {
		font-size: 0.85rem;
		padding: 4px 8px;
	}

	.edit-form button {
		font-size: 0.85rem;
		background-color: #10b981; /* Vert pour signifier la validation */
	}

	.edit-form button:hover {
		background-color: #059669;
	}
</style>
