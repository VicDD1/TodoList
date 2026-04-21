<script lang="ts">
	import { type Todo } from './App.svelte';

	let { todos, users, onUpdateList } = $props();

	let editingId = $state(null);

	let editValues = $state({ description: '', assigneeId: '' });

	function startEdit(todo: Todo) {
		editingId = todo.id;
		editValues = {
			description: todo.description,
			assigneeId: users.find((u) => u.id === todo.assigneeId)?.id || ''
		};
	}

	async function saveFullEdit(id) {
		await onUpdateList('update', editValues, id);
		editingId = null;
	}
</script>

<ul class="todo-list">
	{#each todos as todo}
		<li class:done={todo.done}>
			<div class="task-info">
				<input
					type="checkbox"
					checked={todo.done}
					onchange={(e: any) =>
						onUpdateList('toggle', todo, { isComplete: e.target.checked }, todo.id)}
				/>
				<span>{todo.description}</span>
				{#if todo.getAssignee(users)}
					<em>({todo.getAssignee(users)?.name})</em>
				{/if}
			</div>
			<div class="task-actions">
				<button onclick={() => onUpdateList('remove', todo)}>Supprimer</button>
			</div>
		</li>
	{/each}
</ul>
