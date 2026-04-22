<script lang="ts">
	import { type Todo } from './App.svelte';

	let { todos, users, onUpdateList } = $props();

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
					onchange={(e: any) =>
						onUpdateList('toggle', todo, { isComplete: e.target.checked }, todo.id)}
				/>
				<span class="label">{todo.description}</span>

				<span class="assignee">{getAssigneeName(todo)}</span>
			</div>
			<div class="task-actions">
				<button onclick={() => onUpdateList('remove', todo)}>Supprimer</button>
			</div>
		</li>
	{/each}
</ul>
