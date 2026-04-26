<script>
  import { onDestroy } from 'svelte'
  import { household, userProfile } from '../../stores/auth.js'
  import { notes, subscribePinboard, unsubscribePinboard, addNote, deleteNote } from '../../stores/pinboard.js'

  let newText = ''

  import { onMount } from 'svelte'
  let stopHouseholdSub
  onMount(() => {
    stopHouseholdSub = household.subscribe(h => { if (h?.id) subscribePinboard(h.id) })
  })

  async function handleAdd() {
    if (!newText.trim() || !$household) return
    await addNote($household.id, newText.trim())
    newText = ''
  }

  function formatTime(ts) {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  onDestroy(() => { stopHouseholdSub?.(); unsubscribePinboard() })
</script>

<div class="view">
  <div class="add-bar">
    <form class="add-form" on:submit|preventDefault={handleAdd}>
      <input bind:value={newText} placeholder="Kurze Notiz hinterlassen…" maxlength="200" required />
      <button type="submit" class="btn btn-primary">📌 Pinnen</button>
    </form>
  </div>

  <div class="scroll-area notes-area">
    {#if $notes.length === 0}
      <div class="empty-state">
        <div class="icon">📌</div>
        <p>Noch keine Notizen. Hinterlasst euch kurze Nachrichten hier.</p>
      </div>
    {:else}
      {#each $notes as note (note.id)}
        <div class="note" class:own={note.createdBy === $userProfile?.uid}>
          <div class="note-text">{note.text}</div>
          <div class="note-meta">
            <span class="note-author">{note.createdByName}</span>
            <span class="note-time">{formatTime(note.createdAt)}</span>
            {#if note.createdBy === $userProfile?.uid}
              <button class="delete-btn" on:click={() => deleteNote(note.id)}>✕</button>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .view { display: flex; flex-direction: column; height: 100%; }
  .add-bar { padding: 0.75rem; background: var(--color-surface); border-bottom: 1px solid var(--color-border); }
  .add-form { display: flex; gap: 0.5rem; }
  .add-form input { flex: 1; }

  .notes-area { padding: 0.75rem; display: flex; flex-direction: column; gap: 0.6rem; }
  .note {
    background: #fffde7;
    border-radius: var(--radius);
    padding: 0.85rem 1rem;
    box-shadow: var(--shadow);
    border-left: 4px solid var(--color-warning);
  }
  .note.own { border-left-color: var(--color-primary); background: var(--color-primary-light); }
  .note-text { font-size: 0.95rem; line-height: 1.5; margin-bottom: 0.4rem; }
  .note-meta { display: flex; align-items: center; gap: 0.5rem; }
  .note-author { font-size: 0.75rem; font-weight: 700; color: var(--color-text-muted); }
  .note-time { font-size: 0.72rem; color: var(--color-text-muted); flex: 1; }
  .delete-btn { background: none; color: var(--color-text-muted); font-size: 0.72rem; opacity: 0.6; }
  .delete-btn:hover { opacity: 1; color: var(--color-danger); }
</style>
