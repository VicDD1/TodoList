<script lang="ts">
	import { type Task, type User } from './Dashboard.svelte';
	import removeIcon from './remove.svg';
	import doneIcon from './done.svg';
	import { flip } from 'svelte/animate';
	import { tick } from 'svelte';

	interface Props {
		tasks: Task[];
		users: User[];
		onUpdateTask(task: Task): void;
		onToggleTask(task: Task): void;
		onDelete(task: Task): void;
		updateTaskError?: Error | null;
		removeTaskError?: Error | null;
	}

	let {
		tasks,
		users,
		onUpdateTask,
		onToggleTask,
		onDelete,
		updateTaskError = $bindable(),
		removeTaskError = $bindable()
	}: Props = $props();

	let editing = $state<Task | null>(null);
	let labelEl = $state<HTMLInputElement>();
	let assigneeEl = $state<HTMLSelectElement>();

	let sortedTasks = $derived(tasks.toSorted((a, b) => Number(a.done) - Number(b.done)));

	function getAssigneeName(task: Task) {
		if (!task.assigneeId) return 'Non assigné';
		const assignee = users.find((user) => user.id === task.assigneeId);
		return assignee ? assignee.name : 'Non assigné';
	}

	function onSubmit(evt: Event) {
		if (editing) {
			evt.preventDefault();
			onUpdateTask(editing);
			editing = null;
		}
	}

	async function selectUpdateTask(task: Task, focus: 'label' | 'assignee' = 'label') {
		editing = task.clone();

		await tick();

		if (focus == 'label' && labelEl) {
			labelEl.focus();
		} else if (focus == 'assignee' && assigneeEl) {
			assigneeEl.focus();
		} else {
			return;
		}
	}
</script>

<ul class="todo-list">
	{#each sortedTasks as task, i (task.id)}
		<li class:done={task.done} animate:flip={{ duration: 400 }}>
			<div class="task-info">
				<input type="checkbox" checked={task.done} onchange={() => onToggleTask(task)} />
				{#if editing?.id === task.id}
					<form onsubmit={onSubmit} class="edit-form">
						<input
							type="text"
							placeholder="Description"
							bind:this={labelEl}
							bind:value={editing.description}
							id="edit-input"
						/>

						<select bind:this={assigneeEl} bind:value={editing.assigneeId} id="newasigned">
							<option value="">Non assigné</option>
							{#each users as user}
								<option value={user.id}>{user.name}</option>
							{/each}
						</select>
						<button><img src={doneIcon} alt="Valider la Task" /></button>
					</form>
				{:else}
					<button
						type="button"
						class="invisible-button label"
						onclick={() => {
							selectUpdateTask(task, 'label');
						}}
					>
						{task.description}
					</button>

					<button
						type="button"
						class="invisible-button assignee"
						onclick={() => {
							selectUpdateTask(task, 'assignee');
						}}
					>
						({getAssigneeName(task)})
					</button>
				{/if}
			</div>
			<div class="task-actions">
				<button onclick={() => onDelete(task)}>
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

	li {
		background: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		margin-bottom: 12px;
		padding: 0.75rem 1rem;

		justify-content: space-between;
		gap: 15px;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
		align-items: flex-start;
	}

	.task-info {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-grow: 1;
		min-width: 0;
	}
	.task-info input[type='checkbox'] {
		width: 18px;
		height: 18px;
		cursor: pointer;
		accent-color: #4f46e5;
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

	input:focus,
	select:focus {
		outline: none;
		border-color: var(--primary-color);
		box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
	}
	.edit-form button {
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
	}
	.edit-form button img {
		width: 18px;
		height: 18px;
		filter: brightness(0) invert(1);
	}

	.label {
		flex-grow: 1;
		min-width: 0;
		word-break: break-word;
		white-space: normal;
		text-align: left;
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
		font: inherit;
		color: inherit;
		cursor: pointer;
		text-align: left;
	}

	.invisible-button:hover {
		text-decoration: underline;
	}

	.assignee {
		font-size: 0.75rem;
		padding: 4px 10px;
		background-color: #eef2ff;
		color: #4338ca;
		border-radius: 20px;
		font-weight: 600;
		border: 1px solid #dbeafe;
		white-space: nowrap;
		flex-shrink: 0;
	}
	.edit-form {
		display: flex;
		flex-grow: 1;
		gap: 8px;
		align-items: center;
		min-width: 0;
	}

	.edit-form input[type='text'] {
		flex-grow: 1;
		min-width: 0;
	}

	.edit-form select {
		flex-shrink: 0;
	}

	.task-actions {
		display: flex;
		align-items: center;
		margin-top: 0;
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
	}

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
