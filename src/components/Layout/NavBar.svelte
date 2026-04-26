<script>
  import { updateDoc, doc } from 'firebase/firestore'
  import { user, userProfile, household, logout, isAdmin } from '../../stores/auth.js'
  import { todos } from '../../stores/todos.js'
  import { pendingUsers } from '../../stores/admin.js'
  import { db } from '../../lib/firebase.js'

  export let activeTab = 'shopping'

  const baseTabs = [
    { id: 'shopping', label: 'Einkauf', icon: '🛒' },
    { id: 'todos',    label: 'Aufgaben', icon: '✅' },
    { id: 'pinboard', label: 'Pinnwand', icon: '📌' },
    { id: 'calendar', label: 'Kalender', icon: '📅' },
    { id: 'budget',   label: 'Haushalt', icon: '💶' },
  ]

  $: tabs = $isAdmin
    ? [...baseTabs, { id: 'admin', label: 'Freigaben', icon: '🔑' }]
    : baseTabs

  $: openTodos = $todos.filter(t => !t.done).length
  $: pendingCount = $pendingUsers.length

  let showInvite = false
  let copied = false
  let generatingCode = false

  async function ensureInviteCode() {
    if ($household?.inviteCode) return
    generatingCode = true
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase()
      await updateDoc(doc(db, 'households', $household.id), { inviteCode: code })
    } catch (e) {
      console.error('Einladungscode konnte nicht gespeichert werden:', e)
    }
    generatingCode = false
  }

  async function handleOpenInvite() {
    showInvite = !showInvite
    if (showInvite) await ensureInviteCode()
  }

  function copyCode() {
    if (!$household?.inviteCode) return
    navigator.clipboard.writeText($household.inviteCode)
    copied = true
    setTimeout(() => copied = false, 2000)
  }

  function copyLink() {
    if (!$household?.inviteCode) return
    const text = `Tritt unserem Haushalt bei! 🏠\nURL: ${window.location.origin}\nEinladungscode: ${$household.inviteCode}`
    navigator.clipboard.writeText(text)
    copied = true
    setTimeout(() => copied = false, 2000)
  }
</script>

<nav class="navbar">
  <div class="navbar-top">
    <div class="household-name">{$household?.name || 'Haushalts-App'}</div>
    <div class="user-info">
      <button class="invite-btn" on:click={handleOpenInvite} title="Einladen">🔗</button>
      {#if $userProfile?.photoURL}
        <img src={$userProfile.photoURL} alt="Avatar" class="avatar" />
      {:else}
        <div class="avatar-placeholder">{($userProfile?.displayName || '?')[0].toUpperCase()}</div>
      {/if}
      <button class="logout-btn" on:click={logout} title="Abmelden">↩</button>
    </div>
  </div>

  {#if showInvite}
    <div class="invite-panel">
      <div class="invite-header">
        <span>Einladung teilen</span>
        <button on:click={() => showInvite = false}>✕</button>
      </div>

      {#if generatingCode}
        <div class="invite-code muted">Wird generiert…</div>
      {:else if $household?.inviteCode}
        <div class="invite-code">{$household.inviteCode}</div>
      {:else}
        <div class="invite-code muted">—</div>
      {/if}

      <p class="invite-hint">
        Desi öffnet <strong>{window.location.origin}</strong>,
        registriert sich und gibt diesen Code ein.
      </p>
      <div class="invite-actions">
        <button class="btn btn-primary" on:click={copyCode} disabled={!$household?.inviteCode}>
          {copied ? '✓ Kopiert!' : '📋 Code kopieren'}
        </button>
        <button class="btn btn-ghost" on:click={copyLink} disabled={!$household?.inviteCode}>
          {copied ? '✓ Kopiert!' : '🔗 Nachricht kopieren'}
        </button>
      </div>
    </div>
  {/if}

  <div class="tab-bar">
    {#each tabs as tab}
      <button
        class="tab-btn"
        class:active={activeTab === tab.id}
        on:click={() => activeTab = tab.id}
      >
        <span class="tab-icon">{tab.icon}</span>
        <span class="tab-label">{tab.label}</span>
        {#if tab.id === 'todos' && openTodos > 0}
          <span class="tab-badge">{openTodos}</span>
        {/if}
        {#if tab.id === 'admin' && pendingCount > 0}
          <span class="tab-badge tab-badge-danger">{pendingCount}</span>
        {/if}
      </button>
    {/each}
  </div>
</nav>

<style>
  .navbar {
    background: var(--color-surface);
    box-shadow: 0 1px 0 var(--color-border);
    position: sticky; top: 0; z-index: 100;
  }
  .navbar-top {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.6rem 1rem;
  }
  .household-name { font-family: var(--font-serif); font-size: 1.1rem; font-weight: 600; }
  .user-info { display: flex; align-items: center; gap: 0.6rem; }
  .avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
  .avatar-placeholder {
    width: 32px; height: 32px; border-radius: 50%;
    background: var(--color-primary-light); color: var(--color-primary);
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 0.85rem;
  }
  .logout-btn { background: none; color: var(--color-text-muted); font-size: 1rem; padding: 0.25rem; }
  .invite-btn { background: none; font-size: 1.1rem; padding: 0.25rem; }

  .invite-panel {
    padding: 1rem;
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
    border-bottom: 2px solid var(--color-primary);
  }
  .invite-header {
    display: flex; justify-content: space-between; align-items: center;
    font-weight: 700; font-size: 0.9rem; margin-bottom: 0.75rem;
  }
  .invite-header button { background: none; color: var(--color-text-muted); font-size: 0.9rem; }
  .invite-code {
    font-family: monospace; font-size: 2rem; font-weight: 700; letter-spacing: 0.3em;
    text-align: center; color: var(--color-primary);
    background: var(--color-primary-light); border-radius: var(--radius-sm);
    padding: 0.6rem 1rem; margin-bottom: 0.6rem;
  }
  .invite-code.muted { color: var(--color-text-muted); font-size: 1.2rem; letter-spacing: normal; }
  .invite-hint { font-size: 0.8rem; color: var(--color-text-muted); margin-bottom: 0.75rem; line-height: 1.5; }
  .invite-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }

  .tab-bar { display: flex; border-top: 1px solid var(--color-border); }
  .tab-btn {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; gap: 0.15rem; padding: 0.5rem 0.25rem;
    background: none; color: var(--color-text-muted);
    font-size: 0.7rem; font-weight: 500; position: relative;
    transition: color 0.15s;
  }
  .tab-btn.active { color: var(--color-primary); }
  .tab-btn.active .tab-icon { transform: scale(1.15); }
  .tab-icon { font-size: 1.2rem; transition: transform 0.15s; }
  .tab-label { font-size: 0.65rem; }
  .tab-badge {
    position: absolute; top: 4px; right: calc(50% - 18px);
    background: var(--color-accent); color: white;
    font-size: 0.6rem; font-weight: 700;
    padding: 0.05rem 0.3rem; border-radius: 99px; min-width: 14px; text-align: center;
  }
  .tab-badge-danger { background: var(--color-danger); }
</style>
