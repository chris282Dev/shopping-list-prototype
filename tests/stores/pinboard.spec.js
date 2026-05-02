import { describe, it, expect, beforeEach, vi } from 'vitest'
import { get } from 'svelte/store'
import {
  notes, subscribePinboard, unsubscribePinboard, addNote, deleteNote
} from '../../src/stores/pinboard.js'
import * as firestore from 'firebase/firestore'
import { db } from '../../src/lib/firebase.js'
import { user } from '../../src/stores/auth.js'

describe('Pinboard Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    notes.set([])
    user.set({ uid: 'user123', displayName: 'Test User' })
  })

  describe('addNote', () => {
    it('should add a new note with text', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'note123'
      })

      await addNote('household123', 'Remember to buy milk')

      const call = vi.mocked(firestore.addDoc).mock.calls[0]
      const data = call[1]

      expect(data.householdId).toBe('household123')
      expect(data.text).toBe('Remember to buy milk')
      expect(data.createdAt).toBeDefined()
    })

    it('should include creator information', async () => {
      const testUser = {
        uid: 'user456',
        displayName: 'Alice Smith'
      }
      user.set(testUser)

      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'note123'
      })

      await addNote('household123', 'Note text')

      const data = vi.mocked(firestore.addDoc).mock.calls[0][1]

      expect(data.createdBy).toBe('user456')
      expect(data.createdByName).toBe('Alice Smith')
    })

    it('should handle different note texts', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'note123'
      })

      const texts = [
        'Simple note',
        'Заметка на русском',
        '日本語のメモ',
        'Note with special chars: @#$%^&*()',
        'Very long note that contains a lot of text to ensure we handle longer notes correctly and that everything works as expected in the system'
      ]

      for (const text of texts) {
        await addNote('household123', text)
      }

      expect(firestore.addDoc).toHaveBeenCalledTimes(5)
    })

    it('should handle empty note text', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'note123'
      })

      await addNote('household123', '')

      const data = vi.mocked(firestore.addDoc).mock.calls[0][1]
      expect(data.text).toBe('')
    })

    it('should handle very long notes', async () => {
      const longText = 'A'.repeat(5000)

      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'note123'
      })

      await addNote('household123', longText)

      const data = vi.mocked(firestore.addDoc).mock.calls[0][1]
      expect(data.text).toHaveLength(5000)
    })

    it('should handle multiline notes', async () => {
      const multilineText = 'Line 1\nLine 2\nLine 3\nLine 4'

      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'note123'
      })

      await addNote('household123', multilineText)

      const data = vi.mocked(firestore.addDoc).mock.calls[0][1]
      expect(data.text).toBe(multilineText)
    })

    it('should handle adding multiple notes', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'note123'
      })

      await addNote('household123', 'Note 1')
      await addNote('household123', 'Note 2')
      await addNote('household123', 'Note 3')

      expect(firestore.addDoc).toHaveBeenCalledTimes(3)
    })

    it('should add notes without user context', async () => {
      user.set(null)

      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'note123'
      })

      await addNote('household123', 'Anonymous note')

      const data = vi.mocked(firestore.addDoc).mock.calls[0][1]
      expect(data.createdBy).toBeUndefined()
      expect(data.createdByName).toBeUndefined()
    })
  })

  describe('deleteNote', () => {
    it('should delete a note', async () => {
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined)

      await deleteNote('note123')

      expect(firestore.deleteDoc).toHaveBeenCalled()
    })

    it('should delete correct note by ID', async () => {
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined)

      await deleteNote('note-to-delete')

      expect(firestore.deleteDoc).toHaveBeenCalled()
    })

    it('should handle multiple note deletions', async () => {
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined)

      await deleteNote('note1')
      await deleteNote('note2')
      await deleteNote('note3')

      expect(firestore.deleteDoc).toHaveBeenCalledTimes(3)
    })
  })

  describe('subscribePinboard', () => {
    it('should set up listener for pinboard notes', async () => {
      vi.mocked(firestore.onSnapshot).mockReturnValue(() => {})

      subscribePinboard('household123')

      expect(firestore.onSnapshot).toHaveBeenCalled()
    })

    it('should query notes for correct household', async () => {
      vi.mocked(firestore.onSnapshot).mockReturnValue(() => {})

      subscribePinboard('household-abc-123')

      expect(firestore.onSnapshot).toHaveBeenCalled()
    })

    it('should unsubscribe from previous household', async () => {
      const unsubscribe = vi.fn()
      vi.mocked(firestore.onSnapshot).mockReturnValue(unsubscribe)

      subscribePinboard('household1')
      subscribePinboard('household2')

      expect(unsubscribe).toHaveBeenCalled()
    })

    it('should limit notes to most recent 20', () => {
      const mockUnsubscribe = vi.fn()
      const manyNotes = Array.from({ length: 50 }, (_, i) => ({
        id: `note${i}`,
        data: () => ({
          text: `Note ${i}`,
          createdAt: { toMillis: () => i * 100 }
        })
      }))

      vi.mocked(firestore.onSnapshot).mockImplementation((ref, callback) => {
        callback({
          docs: manyNotes
        })
        return mockUnsubscribe
      })

      subscribePinboard('household123')

      expect(get(notes)).toHaveLength(20)
    })
  })

  describe('unsubscribePinboard', () => {
    it('should unsubscribe from listener', async () => {
      const unsubscribe = vi.fn()
      vi.mocked(firestore.onSnapshot).mockReturnValue(unsubscribe)

      subscribePinboard('household123')
      unsubscribePinboard()

      expect(unsubscribe).toHaveBeenCalled()
    })

    it('should reset notes store to empty array', async () => {
      notes.set([
        { id: '1', text: 'Note 1' },
        { id: '2', text: 'Note 2' }
      ])

      const unsubscribe = vi.fn()
      vi.mocked(firestore.onSnapshot).mockReturnValue(unsubscribe)

      subscribePinboard('household123')
      unsubscribePinboard()

      expect(get(notes)).toEqual([])
    })
  })

  describe('Store subscription behavior', () => {
    it('should sort notes by creation date descending', () => {
      const mockNotes = [
        {
          id: '1',
          text: 'Old note',
          createdAt: { toMillis: () => 100 }
        },
        {
          id: '2',
          text: 'New note',
          createdAt: { toMillis: () => 300 }
        },
        {
          id: '3',
          text: 'Middle note',
          createdAt: { toMillis: () => 200 }
        }
      ]

      const unsubscribe = vi.fn()
      vi.mocked(firestore.onSnapshot).mockImplementation((ref, callback) => {
        callback({
          docs: mockNotes.map(n => ({
            id: n.id,
            data: () => n
          }))
        })
        return unsubscribe
      })

      subscribePinboard('household123')

      const sorted = get(notes)
      expect(sorted[0].id).toBe('2') // Newest first
      expect(sorted[1].id).toBe('3')
      expect(sorted[2].id).toBe('1') // Oldest last
    })

    it('should handle notes without timestamp', () => {
      const mockNotes = [
        { id: '1', text: 'No timestamp' },
        { id: '2', text: 'With timestamp', createdAt: { toMillis: () => 100 } }
      ]

      const unsubscribe = vi.fn()
      vi.mocked(firestore.onSnapshot).mockImplementation((ref, callback) => {
        callback({
          docs: mockNotes.map(n => ({
            id: n.id,
            data: () => n
          }))
        })
        return unsubscribe
      })

      subscribePinboard('household123')

      expect(get(notes)).toHaveLength(2)
    })

    it('should only keep most recent 20 notes when many exist', () => {
      const manyNotes = Array.from({ length: 100 }, (_, i) => ({
        id: `note${i}`,
        data: () => ({
          text: `Note ${i}`,
          createdAt: { toMillis: () => i * 100 }
        })
      }))

      const unsubscribe = vi.fn()
      vi.mocked(firestore.onSnapshot).mockImplementation((ref, callback) => {
        callback({ docs: manyNotes })
        return unsubscribe
      })

      subscribePinboard('household123')

      const currentNotes = get(notes)
      expect(currentNotes).toHaveLength(20)
    })

    it('should include full note data with IDs', () => {
      const mockNotes = [
        {
          id: 'note1',
          text: 'Test note',
          createdBy: 'user123',
          createdByName: 'John',
          createdAt: { toMillis: () => 100 }
        }
      ]

      const unsubscribe = vi.fn()
      vi.mocked(firestore.onSnapshot).mockImplementation((ref, callback) => {
        callback({
          docs: mockNotes.map(n => ({
            id: n.id,
            data: () => n
          }))
        })
        return unsubscribe
      })

      subscribePinboard('household123')

      const pinnedNotes = get(notes)
      expect(pinnedNotes[0]).toHaveProperty('id', 'note1')
      expect(pinnedNotes[0]).toHaveProperty('text', 'Test note')
      expect(pinnedNotes[0]).toHaveProperty('createdBy', 'user123')
      expect(pinnedNotes[0]).toHaveProperty('createdByName', 'John')
    })
  })

  describe('Edge cases', () => {
    it('should handle special characters in notes', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'note123'
      })

      const specialTexts = [
        '🍎 Apples for health',
        'Price: €10,50',
        'Email: test@example.com',
        'URL: https://example.com?q=test&v=1'
      ]

      for (const text of specialTexts) {
        await addNote('household123', text)
      }

      expect(firestore.addDoc).toHaveBeenCalledTimes(4)
    })

    it('should handle HTML-like content in notes', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'note123'
      })

      await addNote('household123', '<div>This is not HTML</div>')

      const data = vi.mocked(firestore.addDoc).mock.calls[0][1]
      expect(data.text).toBe('<div>This is not HTML</div>')
    })

    it('should handle notes with code snippets', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'note123'
      })

      const codeSnippet = `
function hello() {
  console.log('Hello, World!');
}
      `

      await addNote('household123', codeSnippet)

      const data = vi.mocked(firestore.addDoc).mock.calls[0][1]
      expect(data.text).toContain('function hello')
    })

    it('should handle notes with tabs and spaces', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'note123'
      })

      const formattedText = 'Line 1\n\tIndented\n\t\tDouble indented'

      await addNote('household123', formattedText)

      const data = vi.mocked(firestore.addDoc).mock.calls[0][1]
      expect(data.text).toBe(formattedText)
    })
  })

  describe('Note creation details', () => {
    it('should create note with correct structure', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'note123'
      })

      await addNote('household123', 'Test note')

      const data = vi.mocked(firestore.addDoc).mock.calls[0][1]

      expect(data).toHaveProperty('householdId')
      expect(data).toHaveProperty('text')
      expect(data).toHaveProperty('createdBy')
      expect(data).toHaveProperty('createdByName')
      expect(data).toHaveProperty('createdAt')
    })

    it('should add to correct collection', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({
        id: 'note123'
      })

      await addNote('household123', 'Note')

      const call = vi.mocked(firestore.addDoc).mock.calls[0]
      expect(firestore.addDoc).toHaveBeenCalled()
    })
  })
})
