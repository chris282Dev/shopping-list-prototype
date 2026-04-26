<script>
  import { onDestroy } from 'svelte'
  import { household, userProfile } from '../../stores/auth.js'
  import { todos, subscribeTodos, unsubscribeTodos, addTodo, toggleTodo, deleteTodo } from '../../stores/todos.js'

  let newTitle = ''
  let assignedTo = 'anyone' // 'anyone' | uid
  let showDone = false

  import { onMount } from 'svelte'
  let stopHouseholdSub
  onMount(() => {
    stopHouseholdSub = household.subscribe(h => { if (h?.id) subscribeTodos(h.id) })
  })

  // Haushaltsmitglieder für Zuweisung
  $: members = $household?.memberProfiles || []

  $: openTodos = $todos.filter(t => !t.done)
  $: doneTodos = $todos.filter(t => t.done)

  async function handleAdd() {
    if (!newTitle.trim() || !$household) return
    let assignedToUid = null, assignedToName = null
    if (assignedTo !== 'anyone') {
      assignedToUid = assignedTo
      if (assignedTo === $userProfile?.uid) {
        assignedToName = $userProfile.displayName
      } else {
        assignedToName = members.find(m => m.uid === assignedTo)?.displayName || assignedTo
      }
    }
    await addTodo($household.id, { title: newTitle.trim(), assignedTo: assignedToUid, assignedToName })
    newTitle = ''
  }

  function isForMe(todo) {
    return todo.assignedTo === $userProfile?.uid
  }

  onDestroy(() => { stopHouseholdSub?.(); unsubscribeTodos() })
</script>

<div class="view">
  <div class="add-bar">
    <form class="add-form" on:submit|preventDefault={handleAdd}>
      <input bind:value={newTitle} placeholder="Neue Aufgabe…" required />
      <select bind:value={assignedTo}>
        <option value="anyone">Für alle</option>
        {#if $userProfile}
          <option value={$userProfile.uid}>Für mich</option>
        {/if}
      </select>
      <button type="submit" class="btn btn-primary">＋</button>
    </form>
  </div>

  <div class="scroll-area todos-area">
    {#if openTodos.length === 0 && doneTodos.length === 0}
      <div class="empty-state">
        <div class="icon">✅</div>
        <p>Keine Aufgaben offen. Gut gemacht!</p>
      </div>
    {:else}
      {#each openTodos as todo (todo.id)}
        <div class="todo" class:mine={isForMe(todo)}>
          <button class="check-btn" on:click={() => toggleTodo(todo.id, todo.done)}></button>
          <div class="todo-info">
            <span class="todo-title">{todo.title}</span>
            {#if todo.assignedToName}
              <span class="todo-assigned">→ {todo.assignedToName}</span>
            {/if}
            <span class="todo-creator">von {todo.createdByName}</span>
          </div>
          <button class="delete-btn" on:click={() => deleteTodo(todo.id)}>✕</button>
        </div>
      {/each}

      {#if doneTodos.length > 0}
        <button class="show-done-btn" on:click={() => showDone = !showDone}>
          {showDone ? '▲' : '▼'} {doneTodos.length} erledigte Aufgabe{doneTodos.length !== 1 ? 'n' : ''}
        </button>
        {#if showDone}
          {#each doneTodos as todo (todo.id)}
            <div class="todo done">
              <button class="check-btn done-check" on:click={() => toggleTodo(todo.id, todo.done)}>✓</button>
              <div class="todo-info">
                <span class="todo-title">{todo.title}</span>
              </div>
              <button class="delete-btn" on:click={() => deleteTodo(todo.id)}>✕</button>
            </div>
          {/each}
        {/if}
      {/if}
    {/if}
  </div>
</div>

<style>
  .view { display: flex; flex-direction: column; height: 100%; }
  .add-bar { padding: 0.75rem; background: var(--color-surface); border-bottom: 1px solid var(--color-border); }
  .add-form { display: flex; gap: 0.5rem; }
  .add-form input { flex: 1; }
  .add-form select { max-width: 130px; }

  .todos-area { padding: 0.75rem; }
  .todo {
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.75rem; background: var(--color-surface);
    border-radius: var(--radius-sm); margin-bottom: 0.4rem;
    box-shadow: var(--shadow); border-left: 3px solid transparent;
    transition: all 0.15s;
  }
  .todo.mine { border-left-color: var(--color-primary); }
  .todo.done { opacity: 0.45; }
  .todo.done .todo-title { text-decoration: line-through; }

  .check-btn {
    width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;
    border: 2px solid var(--color-primary); background: none; cursor: pointer;
  }
  .done-check { background: var(--color-success); border-color: var(--color-success); color: white; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; }

  .todo-info { flex: 1; display: flex; flex-direction: column; gap: 0.1rem; }
  .todo-title { font-size: 0.92rem; font-weight: 500; }
  .todo-assigned { font-size: 0.75rem; color: var(--color-primary); font-weight: 600; }
  .todo-creator { font-size: 0.72rem; color: var(--color-text-muted); }

  .delete-btn { background: none; color: var(--color-text-muted); font-size: 0.75rem; opacity: 0.5; }
  .delete-btn:hover { opacity: 1; color: var(--color-danger); }

  .show-done-btn {
    background: none; color: var(--color-text-muted); font-size: 0.8rem;
    padding: 0.4rem 0; width: 100%; text-align: center; margin-top: 0.25rem;
  }
</style>
