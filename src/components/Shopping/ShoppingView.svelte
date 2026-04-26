<script>
  import { onMount, onDestroy } from 'svelte'
  import { get } from 'svelte/store'
  import { household } from '../../stores/auth.js'
  import {
    shoppingLists, activeListId, shoppingItems, CATEGORIES,
    subscribeShoppingData, unsubscribeShopping,
    addShoppingList, deleteShoppingList, addItem, toggleItem, deleteItem, deleteCheckedItems
  } from '../../stores/shopping.js'

  let newItemName = '', newItemQty = '', newItemCat = CATEGORIES[0]
  let newListName = '', showNewList = false
  let showAddItem = false

  let stopHouseholdSub

  onMount(() => {
    stopHouseholdSub = household.subscribe(h => {
      if (h?.id) subscribeShoppingData(h.id)
    })
  })

  $: activeList = $shoppingLists.find(l => l.id === $activeListId)
  $: categoryOrder = activeList?.categoryOrder || CATEGORIES
  $: groupedItems = groupByCategory($shoppingItems, categoryOrder)
  $: checkedCount = $shoppingItems.filter(i => i.checked).length

  function groupByCategory(items, order) {
    const groups = {}
    order.forEach(c => { groups[c] = [] })
    items.forEach(i => {
      const cat = i.category || 'Sonstiges'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(i)
    })
    return order.map(c => ({ category: c, items: groups[c] || [] })).filter(g => g.items.length > 0)
  }

  async function handleAddItem() {
    if (!newItemName.trim() || !$activeListId || !$household) return
    await addItem($activeListId, { name: newItemName.trim(), quantity: newItemQty.trim(), category: newItemCat }, $household.id)
    newItemName = ''; newItemQty = ''
    showAddItem = false
  }

  async function handleAddList() {
    if (!newListName.trim() || !$household) return
    await addShoppingList(newListName.trim(), $household.id)
    newListName = ''; showNewList = false
  }

  onDestroy(() => {
    stopHouseholdSub?.()
    unsubscribeShopping()
  })
</script>

<div class="view">
  <!-- Liste auswählen -->
  <div class="list-bar">
    <div class="list-tabs">
      {#each $shoppingLists as list}
        <button
          class="list-tab"
          class:active={$activeListId === list.id}
          on:click={() => activeListId.set(list.id)}
        >{list.name}</button>
      {/each}
      <button class="list-tab add-tab" on:click={() => showNewList = !showNewList}>＋</button>
    </div>

    {#if showNewList}
      <form class="new-list-form" on:submit|preventDefault={handleAddList}>
        <input bind:value={newListName} placeholder="Listenname" autofocus />
        <button type="submit" class="btn btn-primary">Erstellen</button>
        <button type="button" class="btn btn-ghost" on:click={() => showNewList = false}>✕</button>
      </form>
    {/if}
  </div>

  <!-- Artikel hinzufügen -->
  <div class="add-bar">
    {#if !showAddItem}
      <button class="btn btn-primary add-toggle" on:click={() => showAddItem = true}>
        + Artikel hinzufügen
      </button>
      {#if checkedCount > 0}
        <button class="btn btn-ghost" on:click={() => deleteCheckedItems($activeListId)}>
          ✓ {checkedCount} löschen
        </button>
      {/if}
    {:else}
      <form class="add-form" on:submit|preventDefault={handleAddItem}>
        <input bind:value={newItemName} placeholder="Artikel" required autofocus />
        <input bind:value={newItemQty} placeholder="Menge (opt.)" style="max-width: 100px" />
        <select bind:value={newItemCat}>
          {#each CATEGORIES as cat}<option>{cat}</option>{/each}
        </select>
        <button type="submit" class="btn btn-primary">Hinzufügen</button>
        <button type="button" class="btn btn-ghost" on:click={() => showAddItem = false}>✕</button>
      </form>
    {/if}
  </div>

  <!-- Artikelliste -->
  <div class="items-area scroll-area">
    {#if $shoppingItems.length === 0}
      <div class="empty-state">
        <div class="icon">🛒</div>
        <p>Die Liste ist leer. Füge deinen ersten Artikel hinzu!</p>
      </div>
    {:else}
      {#each groupedItems as group}
        <div class="category-group">
          <div class="category-header">{group.category}</div>
          {#each group.items as item (item.id)}
            <div class="item" class:checked={item.checked}>
              <button class="check-btn" on:click={() => toggleItem(item.id, item.checked)}>
                {item.checked ? '✓' : ''}
              </button>
              <div class="item-info">
                <span class="item-name">{item.name}</span>
                {#if item.quantity}<span class="item-qty">{item.quantity}</span>{/if}
              </div>
              <button class="delete-btn" on:click={() => deleteItem(item.id)}>✕</button>
            </div>
          {/each}
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .view { display: flex; flex-direction: column; height: 100%; }
  .list-bar { background: var(--color-surface); border-bottom: 1px solid var(--color-border); padding: 0.5rem 0.75rem; }
  .list-tabs { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .list-tab {
    padding: 0.3rem 0.75rem; border-radius: 99px; font-size: 0.82rem; font-weight: 600;
    border: 1.5px solid var(--color-border); background: var(--color-bg); color: var(--color-text-muted);
    cursor: pointer; transition: all 0.15s;
  }
  .list-tab.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }
  .list-tab.add-tab { border-style: dashed; }
  .new-list-form { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
  .new-list-form input { max-width: 200px; }

  .add-bar { padding: 0.75rem; display: flex; gap: 0.5rem; background: var(--color-surface); border-bottom: 1px solid var(--color-border); }
  .add-toggle { flex: 1; }
  .add-form { display: flex; gap: 0.5rem; flex-wrap: wrap; width: 100%; }
  .add-form input, .add-form select { flex: 1; min-width: 100px; }

  .items-area { padding: 0.75rem; }
  .category-group { margin-bottom: 1rem; }
  .category-header { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); margin-bottom: 0.4rem; padding: 0 0.25rem; }
  .item {
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.65rem 0.75rem; background: var(--color-surface);
    border-radius: var(--radius-sm); margin-bottom: 0.35rem;
    box-shadow: var(--shadow); transition: opacity 0.15s;
  }
  .item.checked { opacity: 0.5; }
  .item.checked .item-name { text-decoration: line-through; }
  .check-btn {
    width: 24px; height: 24px; border-radius: 50%;
    border: 2px solid var(--color-primary); background: none;
    color: var(--color-primary); font-size: 0.75rem; font-weight: 700;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .item.checked .check-btn { background: var(--color-primary); color: white; }
  .item-info { flex: 1; }
  .item-name { font-size: 0.9rem; }
  .item-qty { font-size: 0.78rem; color: var(--color-text-muted); margin-left: 0.4rem; }
  .delete-btn { background: none; color: var(--color-text-muted); font-size: 0.75rem; padding: 0.2rem; opacity: 0.5; }
  .delete-btn:hover { opacity: 1; color: var(--color-danger); }
</style>
