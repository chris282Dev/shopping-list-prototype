import { describe, it, expect, beforeEach, vi } from 'vitest'
import { get } from 'svelte/store'
import {
  shoppingLists, activeListId, allItems, shoppingItems, CATEGORIES,
  subscribeShoppingData, unsubscribeShopping, addShoppingList, deleteShoppingList,
  addItem, toggleItem, deleteItem, deleteCheckedItems
} from '../../src/stores/shopping.js'
import * as firestore from 'firebase/firestore'
import { db } from '../../src/lib/firebase.js'
import { user } from '../../src/stores/auth.js'

describe('Shopping Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    shoppingLists.set([])
    activeListId.set(null)
    allItems.set([])
    user.set({ uid: 'user123', displayName: 'Test User' })
  })

  describe('CATEGORIES', () => {
    it('should define shopping categories', () => {
      expect(CATEGORIES).toEqual([
        'Obst & Gemüse', 'Kühlschrank', 'Getränke',
        'Backen & Kochen', 'Drogerie', 'Haushalt', 'Sonstiges'
      ])
    })

    it('should contain expected categories', () => {
      expect(CATEGORIES).toContain('Obst & Gemüse')
      expect(CATEGORIES).toContain('Kühlschrank')
      expect(CATEGORIES).toContain('Getränke')
      expect(CATEGORIES).toContain('Backen & Kochen')
      expect(CATEGORIES).toContain('Drogerie')
      expect(CATEGORIES).toContain('Haushalt')
      expect(CATEGORIES).toContain('Sonstiges')
    })
  })

  describe('addShoppingList', () => {
    it('should add a new shopping list with name and household ID', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'list123'
      })

      await addShoppingList('Groceries', 'household123')

      expect(firestore.addDoc).toHaveBeenCalled()
      const call = vi.mocked(firestore.addDoc).mock.calls[0]
      const data = call[1]

      expect(data.name).toBe('Groceries')
      expect(data.householdId).toBe('household123')
      expect(data.categoryOrder).toEqual(CATEGORIES)
      expect(data.createdAt).toBeDefined()
    })

    it('should include categoryOrder in new list', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'list123'
      })

      await addShoppingList('Weekly Shopping', 'household123')

      const data = vi.mocked(firestore.addDoc).mock.calls[0][1]
      expect(data.categoryOrder).toEqual(CATEGORIES)
    })

    it('should handle different list names', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'list123'
      })

      const listNames = ['Groceries', 'Restaurant Supplies', 'Café Needs', '特別な買い物']

      for (const name of listNames) {
        await addShoppingList(name, 'household123')
      }

      expect(firestore.addDoc).toHaveBeenCalledTimes(4)
      const calls = vi.mocked(firestore.addDoc).mock.calls

      calls.forEach((call, index) => {
        expect(call[1].name).toBe(listNames[index])
      })
    })
  })

  describe('deleteShoppingList', () => {
    it('should delete a shopping list', async () => {
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined)

      await deleteShoppingList('list123')

      expect(firestore.deleteDoc).toHaveBeenCalled()
    })

    it('should delete correct list by ID', async () => {
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined)

      await deleteShoppingList('list-to-delete')

      expect(firestore.deleteDoc).toHaveBeenCalled()
      const call = vi.mocked(firestore.deleteDoc).mock.calls[0]
      expect(call[0]).toEqual(firestore.doc(db, 'shoppingLists', 'list-to-delete'))
    })
  })

  describe('addItem', () => {
    it('should add item with name, quantity, and category', async () => {
      user.set({ uid: 'user123', displayName: 'John Doe' })

      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'item123'
      })

      await addItem('list123', {
        name: 'Apples',
        quantity: '5 kg',
        category: 'Obst & Gemüse'
      }, 'household123')

      const call = vi.mocked(firestore.addDoc).mock.calls[0]
      const data = call[1]

      expect(data.listId).toBe('list123')
      expect(data.householdId).toBe('household123')
      expect(data.name).toBe('Apples')
      expect(data.quantity).toBe('5 kg')
      expect(data.category).toBe('Obst & Gemüse')
      expect(data.checked).toBe(false)
      expect(data.createdBy).toBe('user123')
      expect(data.createdByName).toBe('John Doe')
      expect(data.createdAt).toBeDefined()
    })

    it('should set default category when not provided', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'item123'
      })

      await addItem('list123', {
        name: 'Milk'
      }, 'household123')

      const data = vi.mocked(firestore.addDoc).mock.calls[0][1]
      expect(data.category).toBe('Sonstiges')
    })

    it('should set quantity to null when not provided', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'item123'
      })

      await addItem('list123', {
        name: 'Bread'
      }, 'household123')

      const data = vi.mocked(firestore.addDoc).mock.calls[0][1]
      expect(data.quantity).toBeNull()
    })

    it('should include current user information', async () => {
      const testUser = {
        uid: 'user456',
        displayName: 'Alice Smith'
      }
      user.set(testUser)

      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'item123'
      })

      await addItem('list123', {
        name: 'Cheese',
        category: 'Kühlschrank'
      }, 'household123')

      const data = vi.mocked(firestore.addDoc).mock.calls[0][1]
      expect(data.createdBy).toBe('user456')
      expect(data.createdByName).toBe('Alice Smith')
    })

    it('should start with unchecked status', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'item123'
      })

      await addItem('list123', { name: 'Eggs' }, 'household123')

      const data = vi.mocked(firestore.addDoc).mock.calls[0][1]
      expect(data.checked).toBe(false)
    })

    it('should add items with different categories', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'item123'
      })

      const items = [
        { name: 'Apples', category: 'Obst & Gemüse' },
        { name: 'Milk', category: 'Kühlschrank' },
        { name: 'Water', category: 'Getränke' },
        { name: 'Flour', category: 'Backen & Kochen' },
        { name: 'Soap', category: 'Drogerie' },
        { name: 'Sponge', category: 'Haushalt' }
      ]

      for (const item of items) {
        await addItem('list123', item, 'household123')
      }

      expect(firestore.addDoc).toHaveBeenCalledTimes(6)
    })
  })

  describe('toggleItem', () => {
    it('should toggle item checked status from false to true', async () => {
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await toggleItem('item123', false)

      expect(firestore.updateDoc).toHaveBeenCalled()
      const call = vi.mocked(firestore.updateDoc).mock.calls[0]
      expect(call[1]).toEqual({ checked: true })
    })

    it('should toggle item checked status from true to false', async () => {
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await toggleItem('item123', true)

      expect(firestore.updateDoc).toHaveBeenCalled()
      const call = vi.mocked(firestore.updateDoc).mock.calls[0]
      expect(call[1]).toEqual({ checked: false })
    })

    it('should target correct item by ID', async () => {
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await toggleItem('item-abc-123', false)

      expect(firestore.updateDoc).toHaveBeenCalled()
    })
  })

  describe('deleteItem', () => {
    it('should delete an item', async () => {
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined)

      await deleteItem('item123')

      expect(firestore.deleteDoc).toHaveBeenCalled()
    })

    it('should delete correct item by ID', async () => {
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined)

      await deleteItem('item-to-delete')

      expect(firestore.deleteDoc).toHaveBeenCalled()
    })

    it('should handle multiple item deletions', async () => {
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined)

      await deleteItem('item1')
      await deleteItem('item2')
      await deleteItem('item3')

      expect(firestore.deleteDoc).toHaveBeenCalledTimes(3)
    })
  })

  describe('deleteCheckedItems', () => {
    it('should delete all checked items for a list', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: [
          { ref: 'ref1' },
          { ref: 'ref2' },
          { ref: 'ref3' }
        ]
      })

      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined)

      await deleteCheckedItems('list123')

      expect(firestore.getDocs).toHaveBeenCalled()
      expect(firestore.deleteDoc).toHaveBeenCalledTimes(3)
    })

    it('should query for checked items in correct list', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: []
      })

      await deleteCheckedItems('list123')

      expect(firestore.getDocs).toHaveBeenCalled()
      const call = vi.mocked(firestore.query).mock.calls[
        vi.mocked(firestore.query).mock.calls.length - 1
      ]
    })

    it('should handle lists with no checked items', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: []
      })

      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined)

      await deleteCheckedItems('list123')

      expect(firestore.getDocs).toHaveBeenCalled()
      expect(firestore.deleteDoc).not.toHaveBeenCalled()
    })

    it('should delete all checked items even with many items', async () => {
      const manyDocs = Array.from({ length: 50 }, (_, i) => ({
        ref: `ref${i}`
      }))

      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: manyDocs
      })

      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined)

      await deleteCheckedItems('list123')

      expect(firestore.deleteDoc).toHaveBeenCalledTimes(50)
    })
  })

  describe('subscribeShoppingData', () => {
    it('should set up listeners for lists and items', async () => {
      vi.mocked(firestore.onSnapshot).mockReturnValue(() => {})

      subscribeShoppingData('household123')

      expect(firestore.onSnapshot).toHaveBeenCalled()
    })

    it('should not re-subscribe if already subscribed to same household', async () => {
      const unsubscribe = vi.fn()
      vi.mocked(firestore.onSnapshot).mockReturnValue(unsubscribe)

      subscribeShoppingData('household123')
      const callCountFirst = vi.mocked(firestore.onSnapshot).mock.calls.length

      subscribeShoppingData('household123')
      const callCountSecond = vi.mocked(firestore.onSnapshot).mock.calls.length

      // Should not add new subscriptions if already subscribed to same household
      expect(callCountSecond).toBe(callCountFirst)
    })

    it('should unsubscribe from previous household when switching', async () => {
      const unsubscribe = vi.fn()
      vi.mocked(firestore.onSnapshot).mockReturnValue(unsubscribe)

      subscribeShoppingData('household1')
      subscribeShoppingData('household2')

      expect(unsubscribe).toHaveBeenCalled()
    })
  })

  describe('unsubscribeShopping', () => {
    it('should unsubscribe from all listeners', async () => {
      const unsubscribe = vi.fn()
      vi.mocked(firestore.onSnapshot).mockReturnValue(unsubscribe)

      subscribeShoppingData('household123')
      unsubscribeShopping()

      expect(unsubscribe).toHaveBeenCalled()
    })

    it('should reset all stores to empty state', async () => {
      shoppingLists.set([{ id: '1', name: 'List' }])
      allItems.set([{ id: '1', name: 'Item' }])
      activeListId.set('list123')

      const unsubscribe = vi.fn()
      vi.mocked(firestore.onSnapshot).mockReturnValue(unsubscribe)

      subscribeShoppingData('household123')
      unsubscribeShopping()

      expect(get(shoppingLists)).toEqual([])
      expect(get(allItems)).toEqual([])
      expect(get(activeListId)).toBeNull()
    })
  })

  describe('Derived store: shoppingItems', () => {
    it('should filter items by active list', () => {
      const items = [
        { id: '1', listId: 'list1', name: 'Item 1', createdAt: { toMillis: () => 100 } },
        { id: '2', listId: 'list1', name: 'Item 2', createdAt: { toMillis: () => 200 } },
        { id: '3', listId: 'list2', name: 'Item 3', createdAt: { toMillis: () => 300 } }
      ]

      allItems.set(items)
      activeListId.set('list1')

      const filtered = get(shoppingItems)
      expect(filtered).toHaveLength(2)
      expect(filtered[0].listId).toBe('list1')
      expect(filtered[1].listId).toBe('list1')
    })

    it('should return empty array when no active list', () => {
      allItems.set([
        { id: '1', listId: 'list1', name: 'Item 1' }
      ])
      activeListId.set(null)

      expect(get(shoppingItems)).toEqual([])
    })

    it('should sort items by creation date', () => {
      const items = [
        { id: '3', listId: 'list1', name: 'Third', createdAt: { toMillis: () => 300 } },
        { id: '1', listId: 'list1', name: 'First', createdAt: { toMillis: () => 100 } },
        { id: '2', listId: 'list1', name: 'Second', createdAt: { toMillis: () => 200 } }
      ]

      allItems.set(items)
      activeListId.set('list1')

      const filtered = get(shoppingItems)
      expect(filtered[0].id).toBe('1')
      expect(filtered[1].id).toBe('2')
      expect(filtered[2].id).toBe('3')
    })

    it('should handle items without timestamp', () => {
      const items = [
        { id: '1', listId: 'list1', name: 'No timestamp' },
        { id: '2', listId: 'list1', name: 'With timestamp', createdAt: { toMillis: () => 100 } }
      ]

      allItems.set(items)
      activeListId.set('list1')

      const filtered = get(shoppingItems)
      expect(filtered).toHaveLength(2)
    })

    it('should update when allItems changes', () => {
      activeListId.set('list1')

      allItems.set([{ id: '1', listId: 'list1', name: 'Item 1', createdAt: { toMillis: () => 100 } }])
      expect(get(shoppingItems)).toHaveLength(1)

      allItems.set([
        { id: '1', listId: 'list1', name: 'Item 1', createdAt: { toMillis: () => 100 } },
        { id: '2', listId: 'list1', name: 'Item 2', createdAt: { toMillis: () => 200 } }
      ])
      expect(get(shoppingItems)).toHaveLength(2)
    })

    it('should update when activeListId changes', () => {
      allItems.set([
        { id: '1', listId: 'list1', name: 'Item 1', createdAt: { toMillis: () => 100 } },
        { id: '2', listId: 'list2', name: 'Item 2', createdAt: { toMillis: () => 200 } }
      ])

      activeListId.set('list1')
      expect(get(shoppingItems)).toHaveLength(1)

      activeListId.set('list2')
      expect(get(shoppingItems)).toHaveLength(1)
    })
  })

  describe('Edge cases', () => {
    it('should handle adding item without user context', async () => {
      user.set(null)

      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'item123'
      })

      await addItem('list123', { name: 'Item' }, 'household123')

      const data = vi.mocked(firestore.addDoc).mock.calls[0][1]
      expect(data.createdBy).toBeUndefined()
      expect(data.createdByName).toBeUndefined()
    })

    it('should handle empty item name', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'item123'
      })

      await addItem('list123', { name: '' }, 'household123')

      const data = vi.mocked(firestore.addDoc).mock.calls[0][1]
      expect(data.name).toBe('')
    })

    it('should handle special characters in item names', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'item123'
      })

      const specialNames = ['Café', '日本食', 'Ñoño', 'Café & Bar', '🍎 Apples']

      for (const name of specialNames) {
        await addItem('list123', { name }, 'household123')
      }

      expect(firestore.addDoc).toHaveBeenCalledTimes(5)
    })
  })
})
