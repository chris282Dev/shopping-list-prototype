<script>
  import { logout, userProfile } from '../../stores/auth.js'

  $: isRejected = $userProfile?.approvalStatus === 'rejected'
</script>

<div class="wrap">
  <div class="card pending-card">
    <div class="icon">{isRejected ? '🚫' : '⏳'}</div>

    {#if isRejected}
      <h2>Zugang verweigert</h2>
      <p>Deine Registrierung wurde abgelehnt. Wende dich an den Admin, wenn du glaubst, dass das ein Fehler ist.</p>
    {:else}
      <h2>Freigabe ausstehend</h2>
      <p>Dein Konto wurde registriert. Ein Admin muss dich noch freischalten, bevor du loslegen kannst.</p>
    {/if}

    <p class="email">{$userProfile?.email}</p>
    <button class="btn btn-ghost" on:click={logout}>Abmelden</button>
  </div>
</div>

<style>
  .wrap {
    min-height: 100vh; display: flex; align-items: center;
    justify-content: center; padding: 1.5rem;
    background: linear-gradient(135deg, #ede9ff 0%, #ffe4ec 100%);
  }
  .pending-card { width: 100%; max-width: 380px; padding: 2rem; text-align: center; }
  .icon { font-size: 2.5rem; margin-bottom: 1rem; }
  h2 { margin-bottom: 0.75rem; }
  p { color: var(--color-text-muted); font-size: 0.9rem; line-height: 1.6; }
  .email { font-weight: 600; color: var(--color-text); margin: 0.5rem 0 1.25rem; }
</style>
