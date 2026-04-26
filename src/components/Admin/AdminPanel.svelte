<script>
  import { pendingUsers, approveUser, rejectUser } from '../../stores/admin.js'

  let loadingUid = null

  async function handleApprove(uid) {
    loadingUid = uid
    try {
      await approveUser(uid)
    } finally {
      loadingUid = null
    }
  }

  async function handleReject(uid) {
    loadingUid = uid
    try {
      await rejectUser(uid)
    } finally {
      loadingUid = null
    }
  }

  function formatDate(val) {
    if (!val) return ''
    const d = val?.toDate ? val.toDate() : new Date(val)
    return d.toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }
</script>

<div class="scroll-area">
  <div class="panel">
    <div class="panel-header">
      <h2>Freigaben</h2>
      <p class="subtitle">Neue Registrierungen warten auf deine Bestätigung.</p>
    </div>

    {#if $pendingUsers.length === 0}
      <div class="empty-state">
        <div class="icon">✅</div>
        <p>Keine ausstehenden Freigaben.</p>
      </div>
    {:else}
      <ul class="pending-list">
        {#each $pendingUsers as u (u.id)}
          <li class="pending-item">
            <div class="user-left">
              {#if u.photoURL}
                <img src={u.photoURL} alt="Avatar" class="avatar" />
              {:else}
                <div class="avatar-placeholder">
                  {(u.displayName || u.email || '?')[0].toUpperCase()}
                </div>
              {/if}
              <div class="user-info">
                <div class="user-name">{u.displayName || 'Unbekannt'}</div>
                <div class="user-email">{u.email}</div>
                {#if u.createdAt}
                  <div class="user-date">Registriert: {formatDate(u.createdAt)}</div>
                {/if}
              </div>
            </div>
            <div class="actions">
              <button
                class="btn btn-primary btn-sm"
                disabled={loadingUid === u.id}
                on:click={() => handleApprove(u.id)}
              >
                {loadingUid === u.id ? '…' : 'Freigeben'}
              </button>
              <button
                class="btn btn-sm btn-reject"
                disabled={loadingUid === u.id}
                on:click={() => handleReject(u.id)}
              >
                Ablehnen
              </button>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  .panel {
    max-width: 600px;
    margin: 0 auto;
    padding: 1.25rem 1rem 2rem;
  }

  .panel-header {
    margin-bottom: 1.25rem;
  }

  .panel-header h2 {
    font-size: 1.3rem;
    margin-bottom: 0.25rem;
  }

  .subtitle {
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }

  .pending-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .pending-item {
    background: var(--color-surface);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .user-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }

  .avatar-placeholder {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--color-primary-light);
    color: var(--color-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1rem;
    flex-shrink: 0;
  }

  .user-info {
    min-width: 0;
  }

  .user-name {
    font-weight: 600;
    font-size: 0.95rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-email {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-date {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    margin-top: 0.15rem;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .btn-sm {
    padding: 0.4rem 0.85rem;
    font-size: 0.85rem;
    border-radius: var(--radius-sm);
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-sm:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .btn-reject {
    background: transparent;
    color: var(--color-danger);
    border: 1.5px solid var(--color-danger);
  }

  .btn-reject:hover:not(:disabled) {
    background: #fff0f0;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--color-text-muted);
  }

  .empty-state .icon {
    font-size: 2.5rem;
    margin-bottom: 0.75rem;
  }

  .empty-state p {
    font-size: 0.95rem;
  }
</style>
