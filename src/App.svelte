<script>
  import { user, userProfile, household, authLoading, isApproved } from './stores/auth.js'
  import AuthScreen from './components/Auth/AuthScreen.svelte'
  import HouseholdSetup from './components/Auth/HouseholdSetup.svelte'
  import PendingApproval from './components/Auth/PendingApproval.svelte'
  import NavBar from './components/Layout/NavBar.svelte'
  import ShoppingView from './components/Shopping/ShoppingView.svelte'
  import TodoView from './components/Todos/TodoView.svelte'
  import PinboardView from './components/Pinboard/PinboardView.svelte'
  import CalendarView from './components/Calendar/CalendarView.svelte'
  import BudgetView from './components/Budget/BudgetView.svelte'
  import AdminPanel from './components/Admin/AdminPanel.svelte'

  let activeTab = 'shopping'
</script>

{#if $authLoading}
  <div class="splash">
    <div class="splash-logo">🏠</div>
    <div class="splash-text">Haushalts-App</div>
  </div>

{:else if !$user}
  <AuthScreen />

{:else if !$userProfile}
  <div class="splash"><p>Profil wird geladen…</p></div>

{:else if $userProfile.approvalStatus === 'pending' || $userProfile.approvalStatus === 'rejected'}
  <PendingApproval />

{:else if !$household}
  <HouseholdSetup />

{:else}
  <div class="app-shell">
    <NavBar bind:activeTab />
    <main class="main-content">
      {#if activeTab === 'shopping'}
        <ShoppingView />
      {:else if activeTab === 'todos'}
        <TodoView />
      {:else if activeTab === 'pinboard'}
        <PinboardView />
      {:else if activeTab === 'calendar'}
        <CalendarView />
      {:else if activeTab === 'budget'}
        <BudgetView />
      {:else if activeTab === 'admin'}
        <AdminPanel />
      {/if}
    </main>
  </div>
{/if}

<style>
  .splash {
    min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: linear-gradient(135deg, #ede9ff 0%, #ffe4ec 100%);
    gap: 0.5rem;
  }
  .splash-logo { font-size: 3rem; }
  .splash-text { font-family: var(--font-serif); font-size: 1.5rem; font-weight: 600; }

  .app-shell { display: flex; flex-direction: column; height: 100vh; height: 100dvh; }
  .main-content { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
</style>
