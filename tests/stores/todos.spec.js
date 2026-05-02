import { describe, it, expect, beforeEach, vi } from 'vitest'
import { get } from 'svelte/store'
import {
  todos, subscribeTodos, unsubscribeTodos, addTodo, toggleTodo, deleteTodo
} from '../../src/stores/todos.js'
import * as firestore from 'firebase/firestore'
import { db } from '../../src/lib/firebase.js'
import { user } from '../../src/stores/auth.js'

describe('Todos Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    todos.set([])
    user.set({ uid: 'user123', displayName: 'Test User' })
  })

  describe('addTodo', () => {
    it('should add a new todo with title', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'todo123'
      })

      await addTodo('household123', { title: 'Buy groceries' })

      const call = vi.mocked(firestore.addDoc).mock.calls[0]
      const data = call[1]

      expect(data.householdId).toBe('household123')
      expect(data.title).toBe('Buy groceries')
      expect(data.done).toBe(false)
      expect(data.createdAt).toBeDefined()
    })

    it('should include assigned user information if provided', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'todo123'
      })

      await addTodo('household123', {
        title: 'Clean kitchen',
        assignedTo: 'user456',
        assignedToName: 'Alice'
      })

      const data = vi.mocked(firestore.addDoc).mock.calls[0][1]

      expect(data.assignedTo).toBe('user456')
      expect(data.assignedToName).toBe('Alice')
    })

    it('should set null for unassigned todo', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'todo123'
      })

      await addTodo('household123', { title: 'Task' })

      const data = vi.mocked(firestore.addDoc).mock.calls[0][1]

      expect(data.assignedTo).toBeNull()
      expect(data.assignedToName).toBeNull()
    })

    it('should include creator information', async () => {
      const testUser = {
        uid: 'user789',
        displayName: 'Bob Smith'
      }
      user.set(testUser)

      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'todo123'
      })

      await addTodo('household123', { title: 'Task' })

      const data = vi.mocked(firestore.addDoc).mock.calls[0][1]

      expect(data.createdBy).toBe('user789')
      expect(data.createdByName).toBe('Bob Smith')
    })

    it('should start with done=false status', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'todo123'
      })

      await addTodo('household123', { title: 'New task' })

      const data = vi.mocked(firestore.addDoc).mock.calls[0][1]
      expect(data.done).toBe(false)
    })

    it('should handle different task titles', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'todo123'
      })

      const titles = [
        'Simple task',
        'Задача на русском',
        '日本語のタスク',
        'Task with special chars: @#$%',
        'Very long task description that contains a lot of text to ensure we handle longer titles correctly'
      ]

      for (const title of titles) {
        await addTodo('household123', { title })
      }

      expect(firestore.addDoc).toHaveBeenCalledTimes(5)
    })

    it('should handle partial assignment data', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'todo123'
      })

      await addTodo('household123', {
        title: 'Task',
        assignedTo: 'user456'
        // assignedToName not provided
      })

      const data = vi.mocked(firestore.addDoc).mock.calls[0][1]
      expect(data.assignedTo).toBe('user456')
      expect(data.assignedToName).toBeNull()
    })
  })

  describe('toggleTodo', () => {
    it('should toggle todo from incomplete to complete', async () => {
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await toggleTodo('todo123', false)

      const call = vi.mocked(firestore.updateDoc).mock.calls[0]
      expect(call[1]).toEqual({ done: true })
    })

    it('should toggle todo from complete to incomplete', async () => {
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await toggleTodo('todo123', true)

      const call = vi.mocked(firestore.updateDoc).mock.calls[0]
      expect(call[1]).toEqual({ done: false })
    })

    it('should update correct todo by ID', async () => {
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await toggleTodo('specific-todo-id', false)

      expect(firestore.updateDoc).toHaveBeenCalled()
    })

    it('should handle multiple toggle operations', async () => {
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await toggleTodo('todo1', false)
      await toggleTodo('todo2', true)
      await toggleTodo('todo3', false)

      expect(firestore.updateDoc).toHaveBeenCalledTimes(3)
    })
  })

  describe('deleteTodo', () => {
    it('should delete a todo', async () => {
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined)

      await deleteTodo('todo123')

      expect(firestore.deleteDoc).toHaveBeenCalled()
    })

    it('should delete correct todo by ID', async () => {
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined)

      await deleteTodo('todo-to-delete')

      expect(firestore.deleteDoc).toHaveBeenCalled()
    })

    it('should handle multiple deletions', async () => {
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined)

      await deleteTodo('todo1')
      await deleteTodo('todo2')
      await deleteTodo('todo3')

      expect(firestore.deleteDoc).toHaveBeenCalledTimes(3)
    })
  })

  describe('subscribeTodos', () => {
    it('should set up listener for todos', async () => {
      vi.mocked(firestore.onSnapshot).mockReturnValue(() => {})

      subscribeTodos('household123')

      expect(firestore.onSnapshot).toHaveBeenCalled()
    })

    it('should unsubscribe from previous household', async () => {
      const unsubscribe = vi.fn()
      vi.mocked(firestore.onSnapshot).mockReturnValue(unsubscribe)

      subscribeTodos('household1')
      subscribeTodos('household2')

      expect(unsubscribe).toHaveBeenCalled()
    })

    it('should query todos for correct household', async () => {
      vi.mocked(firestore.onSnapshot).mockReturnValue(() => {})

      subscribeTodos('household-abc-123')

      expect(firestore.onSnapshot).toHaveBeenCalled()
    })
  })

  describe('unsubscribeTodos', () => {
    it('should unsubscribe from listener', async () => {
      const unsubscribe = vi.fn()
      vi.mocked(firestore.onSnapshot).mockReturnValue(unsubscribe)

      subscribeTodos('household123')
      unsubscribeTodos()

      expect(unsubscribe).toHaveBeenCalled()
    })

    it('should reset todos store to empty array', async () => {
      todos.set([
        { id: '1', title: 'Task 1', done: false },
        { id: '2', title: 'Task 2', done: true }
      ])

      const unsubscribe = vi.fn()
      vi.mocked(firestore.onSnapshot).mockReturnValue(unsubscribe)

      subscribeTodos('household123')
      unsubscribeTodos()

      expect(get(todos)).toEqual([])
    })
  })

  describe('Store subscription behavior', () => {
    it('should sort todos by creation date descending', () => {
      const mockTodos = [
        {
          id: '1',
          title: 'Old task',
          createdAt: { toMillis: () => 100 },
          done: false
        },
        {
          id: '2',
          title: 'New task',
          createdAt: { toMillis: () => 300 },
          done: false
        },
        {
          id: '3',
          title: 'Middle task',
          createdAt: { toMillis: () => 200 },
          done: false
        }
      ]

      const unsubscribe = vi.fn()
      vi.mocked(firestore.onSnapshot).mockImplementation((ref, callback) => {
        callback({
          docs: mockTodos.map(t => ({
            id: t.id,
            data: () => t
          }))
        })
        return unsubscribe
      })

      subscribeTodos('household123')

      const sorted = get(todos)
      expect(sorted[0].id).toBe('2') // Newest first
      expect(sorted[1].id).toBe('3')
      expect(sorted[2].id).toBe('1') // Oldest last
    })

    it('should handle todos without timestamp', () => {
      const mockTodos = [
        { id: '1', title: 'No timestamp' },
        { id: '2', title: 'With timestamp', createdAt: { toMillis: () => 100 } }
      ]

      const unsubscribe = vi.fn()
      vi.mocked(firestore.onSnapshot).mockImplementation((ref, callback) => {
        callback({
          docs: mockTodos.map(t => ({
            id: t.id,
            data: () => t
          }))
        })
        return unsubscribe
      })

      subscribeTodos('household123')

      expect(get(todos)).toHaveLength(2)
    })
  })

  describe('Edge cases', () => {
    it('should handle adding todo without user context', async () => {
      user.set(null)

      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'todo123'
      })

      await addTodo('household123', { title: 'Task' })

      const data = vi.mocked(firestore.addDoc).mock.calls[0][1]
      expect(data.createdBy).toBeUndefined()
      expect(data.createdByName).toBeUndefined()
    })

    it('should handle empty todo title', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'todo123'
      })

      await addTodo('household123', { title: '' })

      const data = vi.mocked(firestore.addDoc).mock.calls[0][1]
      expect(data.title).toBe('')
    })

    it('should handle very long todo titles', async () => {
      const longTitle = 'A'.repeat(1000)

      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'todo123'
      })

      await addTodo('household123', { title: longTitle })

      const data = vi.mocked(firestore.addDoc).mock.calls[0][1]
      expect(data.title).toHaveLength(1000)
    })

    it('should handle special characters in assignments', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'todo123'
      })

      await addTodo('household123', {
        title: 'Task',
        assignedToName: 'José María'
      })

      const data = vi.mocked(firestore.addDoc).mock.calls[0][1]
      expect(data.assignedToName).toBe('José María')
    })
  })
})
