<script>
	import { flip } from 'svelte/animate';

	let { todos, remove, toggle, update, users } = $props();

	let editingId = $state(null);

	let editValues = $state({ description: '', assigneeId: '' });

	function startEdit(todo) {
		editingId = todo.id;
		editValues = {
			description: todo.description,
			assigneeId: users.find((u) => u.name === todo.assignee)?.id || ''
		};
	}

	async function saveFullEdit(id) {
		await update(id, editValues);
		editingId = null;
	}
</script>

<!-- Ce composant affiche la liste des tâches et gère les interactions de base (toggle, suppression,
édition). -->

<ul class="todos">
	{#each todos as todo (todo.id)}
		<li class:done={todo.done} animate:flip={{ duration: 200 }}>
			<div class="todo-item-layout">
				<label class="checkbox-container">
					<input type="checkbox" checked={todo.done} onclick={() => toggle(todo)} />
				</label>

				<div class="task-content">
					{#if editingId === todo.id}
						<div class="edit-mode">
							<input class="edit-input" bind:value={editValues.description} />
							<div class="edit-row">
								<select bind:value={editValues.assigneeId}>
									<option value="">Assigner à...</option>
									{#each users as user}
										<option value={user.id}>{user.name}</option>
									{/each}
								</select>
								<button class="save-btn" onclick={() => saveFullEdit(todo.id)}>OK</button>
							</div>
						</div>
					{:else}
						<span
							class="description"
							role="button"
							tabindex="0"
							onclick={() => startEdit(todo)}
							onkeydown={(e) => e.key === 'Enter' && startEdit(todo)}
						>
							{todo.description}
						</span>
						<div class="metadata">
							{#if todo.assignee}<span>👤 {todo.assignee}</span>{/if}
						</div>
					{/if}
				</div>

				<button class="remove-btn" onclick={() => remove(todo)} aria-label="Remove"></button>
			</div>
		</li>
	{/each}
</ul>

<style>
	.todos {
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.task-content {
		flex-grow: 1; /* Force le contenu central à pousser le bouton remove vers la droite */
	}

	li {
		list-style: none;
		background: white;
		padding: 1rem;
		border-radius: 10px;
		border: 1px solid #e2e8f0;
		transition:
			box-shadow 0.2s,
			transform 0.2s;
	}

	li:hover {
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
	}

	li.done {
		background: #f1f5f9;
		opacity: 0.8;
	}

	.todo-item-layout {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		width: 100%;
	}

	input[type='checkbox'] {
		width: 1.2rem;
		height: 1.2rem;
		cursor: pointer;
		accent-color: #4f46e5;
		margin-top: 0.2rem;
	}

	.description {
		font-size: 1rem;
		font-weight: 500;
		color: #1e293b;
		line-height: 1.4;
		display: block;
		width: 100%;
		cursor: pointer;
		min-height: 1.5rem;
	}

	.description:hover {
		color: #4f46e5;
	}
	.done .description {
		text-decoration: line-through;
		color: #94a3b8;
	}

	.metadata {
		display: flex;
		gap: 1rem;
		margin-top: 0.5rem;
		font-size: 0.8rem;
	}

	.metadata span {
		background: #f1f5f9;
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
		color: #64748b;
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.edit-mode {
		background: #fdfdfd;
		padding: 0.5rem;
		border-radius: 6px;
		width: 100%;
	}

	.edit-input {
		width: 100%;
		border: 1px solid #4f46e5;
		border-radius: 4px;
		padding: 0.4rem;
		margin-bottom: 0.5rem;
	}

	.save-btn {
		background: #22c55e;
		color: white;
		border: none;
		border-radius: 4px;
		padding: 0.3rem 0.8rem;
		cursor: pointer;
	}

	.remove-btn {
		background-color: transparent;
		border: none;
		color: #cbd5e1;
		cursor: pointer;
		padding: 0.5rem;
		transition: color 0.2s;
	}

	.remove-btn:hover {
		color: #ef4444;
	}
</style>
