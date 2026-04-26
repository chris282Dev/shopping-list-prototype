<script>
  import { createHousehold, joinHousehold, logout } from '../../stores/auth.js'

  let mode = 'choose' // 'choose' | 'create' | 'join'
  let householdName = '', joinCode = ''
  let loading = false, error = ''

  async function handleCreate() {
    if (!householdName.trim()) return
    loading = true; error = ''
    try { await createHousehold(householdName.trim()) }
    catch (e) {
      console.error('createHousehold Fehler:', e)
      error = e.message || 'Haushalt konnte nicht erstellt werden.'
    }
    loading = false
  }

  async function handleJoin() {
    if (!joinCode.trim()) return
    loading = true; error = ''
    try { await joinHousehold(joinCode.trim()) }
    catch (e) {
      console.error('joinHousehold Fehler:', e)
      error = e.message || 'Beitreten fehlgeschlagen.'
    }
    loading = false
  }
</script>

<div class="wrap">
  <div class="card setup-card">
    <h2>Haushalt einrichten</h2>
    <p class="subtitle">Erstelle einen neuen Haushalt oder tritt einem bestehenden bei.</p>

    {#if error}<div class="error-msg">{error}</div>{/if}

    {#if mode === 'choose'}
      <div class="choices">
        <button class="choice-btn" on:click={() => mode = 'create'}>
          <span class="icon">🏠</span>
          <strong>Neuen Haushalt erstellen</strong>
          <span>Einladungscode für deine Partnerin generieren</span>
        </button>
        <button class="choice-btn" on:click={() => mode = 'join'}>
          <span class="icon">🔑</span>
          <strong>Haushalt beitreten</strong>
          <span>Mit einem Einladungscode einsteigen</span>
        </button>
      </div>

    {:else if mode === 'create'}
      <form on:submit|preventDefault={handleCreate} class="form">
        <input bind:value={householdName} placeholder="Name eures Haushalts" maxlength="40" required />
        <button type="submit" class="btn btn-primary" disabled={loading}>
          {loading ? 'Erstellen…' : 'Haushalt erstellen'}
        </button>
        <button type="button" class="btn btn-ghost" on:click={() => mode = 'choose'}>Zurück</button>
      </form>

    {:else}
      <form on:submit|preventDefault={handleJoin} class="form">
        <input bind:value={joinCode} placeholder="Einladungscode (6 Zeichen)" maxlength="6" required />
        <button type="submit" class="btn btn-primary" disabled={loading}>
          {loading ? 'Beitreten…' : 'Beitreten'}
        </button>
        <button type="button" class="btn btn-ghost" on:click={() => mode = 'choose'}>Zurück</button>
      </form>
    {/if}

    <button class="logout-btn" on:click={logout}>Abmelden</button>
  </div>
</div>

<style>
  .wrap {
    min-height: 100vh; display: flex; align-items: center;
    justify-content: center; padding: 1.5rem;
    background: linear-gradient(135deg, #ede9ff 0%, #ffe4ec 100%);
  }
  .setup-card { width: 100%; max-width: 420px; padding: 2rem; }
  h2 { font-size: 1.5rem; margin-bottom: 0.25rem; }
  .subtitle { color: var(--color-text-muted); margin-bottom: 1.5rem; font-size: 0.9rem; }
  .choices { display: flex; flex-direction: column; gap: 0.75rem; }
  .choice-btn {
    display: flex; flex-direction: column; gap: 0.2rem;
    padding: 1rem 1.1rem; border-radius: var(--radius);
    border: 1.5px solid var(--color-border); background: var(--color-bg);
    text-align: left; cursor: pointer; transition: all 0.15s;
  }
  .choice-btn:hover { border-color: var(--color-primary); background: var(--color-primary-light); }
  .choice-btn .icon { font-size: 1.4rem; }
  .choice-btn strong { font-size: 0.95rem; color: var(--color-text); }
  .choice-btn span:last-child { font-size: 0.8rem; color: var(--color-text-muted); }
  .form { display: flex; flex-direction: column; gap: 0.75rem; }
  .error-msg { background: #fff0f0; color: var(--color-danger); border-radius: var(--radius-sm); padding: 0.6rem 0.85rem; font-size: 0.875rem; margin-bottom: 1rem; }
  .logout-btn { background: none; color: var(--color-text-muted); font-size: 0.8rem; margin-top: 1.5rem; display: block; margin-left: auto; margin-right: auto; }
</style>
