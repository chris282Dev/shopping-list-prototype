<script>
  import { authError, loginWithEmail, loginWithGoogle, register } from '../../stores/auth.js'

  let mode = 'login' // 'login' | 'register'
  let email = '', password = '', name = ''
  let loading = false

  async function handleEmailLogin() {
    loading = true
    try { await loginWithEmail(email, password) } catch {}
    loading = false
  }

  async function handleGoogle() {
    loading = true
    try { await loginWithGoogle() } catch {}
    loading = false
  }

  async function handleRegister() {
    loading = true
    try { await register(name, email, password) } catch {}
    loading = false
  }
</script>

<div class="auth-wrap">
  <div class="auth-card card">
    <h1>Haushalts-App</h1>
    <p class="subtitle">Willkommen zurück ✦</p>

    {#if $authError}
      <div class="error-msg">{$authError}</div>
    {/if}

    {#if mode === 'login'}
      <form on:submit|preventDefault={handleEmailLogin} class="form">
        <input type="email" bind:value={email} placeholder="E-Mail" required />
        <input type="password" bind:value={password} placeholder="Passwort" required />
        <button type="submit" class="btn btn-primary w-full" disabled={loading}>
          {loading ? 'Anmelden…' : 'Anmelden'}
        </button>
      </form>

      <div class="divider"><span>oder</span></div>

      <button class="btn btn-ghost w-full" on:click={handleGoogle} disabled={loading}>
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.8 2.5 30.3 0 24 0 14.6 0 6.6 5.4 2.5 13.3l7.8 6c1.8-5.5 6.9-9.8 13.7-9.8z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7c4.3-4 6.8-9.8 6.8-16.9z" /><path fill="#FBBC05" d="M10.3 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.5 10.7l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.7l-7.3-5.7c-2.1 1.4-4.7 2.2-8.2 2.2-6.7 0-12.4-4.5-14.4-10.6l-7.8 6A24 24 0 0 0 24 48z"/></svg>
        Mit Google anmelden
      </button>

      <p class="toggle-mode">
        Noch kein Konto?
        <button type="button" on:click={() => { mode = 'register'; authError.set('') }}>Registrieren</button>
      </p>

    {:else}
      <form on:submit|preventDefault={handleRegister} class="form">
        <input type="text" bind:value={name} placeholder="Dein Name" required />
        <input type="email" bind:value={email} placeholder="E-Mail" required />
        <input type="password" bind:value={password} placeholder="Passwort (min. 6 Zeichen)" required minlength="6" />
        <button type="submit" class="btn btn-primary w-full" disabled={loading}>
          {loading ? 'Registrieren…' : 'Konto erstellen'}
        </button>
      </form>
      <p class="toggle-mode">
        Schon registriert?
        <button type="button" on:click={() => { mode = 'login'; authError.set('') }}>Anmelden</button>
      </p>
      <p class="hint">Nach der Registrierung muss ein Admin dein Konto freischalten.</p>
    {/if}
  </div>
</div>

<style>
  .auth-wrap {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    background: linear-gradient(135deg, #ede9ff 0%, #ffe4ec 100%);
  }
  .auth-card {
    width: 100%;
    max-width: 400px;
    padding: 2rem;
  }
  h1 { font-size: 1.8rem; margin-bottom: 0.25rem; }
  .subtitle { color: var(--color-text-muted); margin-bottom: 1.5rem; font-size: 0.95rem; }
  .form { display: flex; flex-direction: column; gap: 0.75rem; }
  .w-full { width: 100%; }
  .error-msg {
    background: #fff0f0;
    color: var(--color-danger);
    border-radius: var(--radius-sm);
    padding: 0.6rem 0.85rem;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }
  .divider {
    display: flex; align-items: center; gap: 0.75rem;
    margin: 1rem 0; color: var(--color-text-muted); font-size: 0.85rem;
  }
  .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--color-border); }
  .toggle-mode {
    text-align: center; margin-top: 1.25rem;
    font-size: 0.875rem; color: var(--color-text-muted);
  }
  .toggle-mode button {
    background: none; color: var(--color-primary);
    font-weight: 600; font-size: inherit; text-decoration: underline;
  }
  .hint { font-size: 0.8rem; color: var(--color-text-muted); text-align: center; margin-top: 0.75rem; }
</style>
