import { describe, it, expect, beforeEach, vi } from 'vitest'
import { get } from 'svelte/store'
import {
  pendingUsers, approveUser, rejectUser
} from '../../src/stores/admin.js'
import * as firestore from 'firebase/firestore'
import { db } from '../../src/lib/firebase.js'
import { user, isAdmin } from '../../src/stores/auth.js'

describe('Admin Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pendingUsers.set([])
    user.set(null)
  })

  describe('approveUser', () => {
    it('should update user approval status to approved', async () => {
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await approveUser('user123')

      const call = vi.mocked(firestore.updateDoc).mock.calls[0]
      const data = call[1]

      expect(data.approvalStatus).toBe('approved')
      expect(data.approvedAt).toBeDefined()
      expect(data.approvedAt).toBeInstanceOf(Date)
    })

    it('should update correct user by ID', async () => {
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await approveUser('specific-user-id')

      expect(firestore.updateDoc).toHaveBeenCalled()
    })

    it('should set approval timestamp', async () => {
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      const beforeTime = new Date()
      await approveUser('user123')
      const afterTime = new Date()

      const data = vi.mocked(firestore.updateDoc).mock.calls[0][1]
      const approvedAt = data.approvedAt

      expect(approvedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
      expect(approvedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime())
    })

    it('should handle approving multiple users', async () => {
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await approveUser('user1')
      await approveUser('user2')
      await approveUser('user3')

      expect(firestore.updateDoc).toHaveBeenCalledTimes(3)
    })

    it('should approve pending users', async () => {
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      const userIds = [
        'pending-user-1',
        'pending-user-2',
        'pending-user-3'
      ]

      for (const uid of userIds) {
        await approveUser(uid)
      }

      expect(firestore.updateDoc).toHaveBeenCalledTimes(3)
      const calls = vi.mocked(firestore.updateDoc).mock.calls

      calls.forEach((call, index) => {
        expect(call[1].approvalStatus).toBe('approved')
      })
    })
  })

  describe('rejectUser', () => {
    it('should update user approval status to rejected', async () => {
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await rejectUser('user123')

      const call = vi.mocked(firestore.updateDoc).mock.calls[0]
      const data = call[1]

      expect(data.approvalStatus).toBe('rejected')
      expect(data.rejectedAt).toBeDefined()
      expect(data.rejectedAt).toBeInstanceOf(Date)
    })

    it('should update correct user by ID', async () => {
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await rejectUser('specific-user-id')

      expect(firestore.updateDoc).toHaveBeenCalled()
    })

    it('should set rejection timestamp', async () => {
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      const beforeTime = new Date()
      await rejectUser('user123')
      const afterTime = new Date()

      const data = vi.mocked(firestore.updateDoc).mock.calls[0][1]
      const rejectedAt = data.rejectedAt

      expect(rejectedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
      expect(rejectedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime())
    })

    it('should handle rejecting multiple users', async () => {
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await rejectUser('user1')
      await rejectUser('user2')
      await rejectUser('user3')

      expect(firestore.updateDoc).toHaveBeenCalledTimes(3)
    })

    it('should reject pending users', async () => {
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      const userIds = [
        'pending-user-1',
        'pending-user-2',
        'pending-user-3'
      ]

      for (const uid of userIds) {
        await rejectUser(uid)
      }

      expect(firestore.updateDoc).toHaveBeenCalledTimes(3)
      const calls = vi.mocked(firestore.updateDoc).mock.calls

      calls.forEach((call, index) => {
        expect(call[1].approvalStatus).toBe('rejected')
      })
    })
  })

  describe('Approval vs Rejection', () => {
    it('should distinguish between approval and rejection operations', async () => {
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await approveUser('user1')
      await rejectUser('user2')

      const approvalCall = vi.mocked(firestore.updateDoc).mock.calls[0][1]
      const rejectionCall = vi.mocked(firestore.updateDoc).mock.calls[1][1]

      expect(approvalCall.approvalStatus).toBe('approved')
      expect(approvalCall).toHaveProperty('approvedAt')
      expect(approvalCall).not.toHaveProperty('rejectedAt')

      expect(rejectionCall.approvalStatus).toBe('rejected')
      expect(rejectionCall).toHaveProperty('rejectedAt')
      expect(rejectionCall).not.toHaveProperty('approvedAt')
    })

    it('should have different timestamp keys for approval vs rejection', async () => {
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await approveUser('user1')
      const approvalData = vi.mocked(firestore.updateDoc).mock.calls[0][1]

      await rejectUser('user2')
      const rejectionData = vi.mocked(firestore.updateDoc).mock.calls[1][1]

      expect(Object.keys(approvalData)).toContain('approvedAt')
      expect(Object.keys(approvalData)).not.toContain('rejectedAt')

      expect(Object.keys(rejectionData)).toContain('rejectedAt')
      expect(Object.keys(rejectionData)).not.toContain('approvedAt')
    })
  })

  describe('Admin subscription behavior', () => {
    it('should set up listener when user is admin', () => {
      const unsubscribe = vi.fn()
      vi.mocked(firestore.onSnapshot).mockReturnValue(unsubscribe)

      // Set user as admin by email matching
      user.set({ email: 'christophwieczorektest1@gmail.com' })

      // Give subscription time to set up
      expect(firestore.onSnapshot).toHaveBeenCalled()
    })

    it('should query for pending users when admin', async () => {
      vi.mocked(firestore.onSnapshot).mockReturnValue(() => {})

      user.set({ email: 'christophwieczorektest1@gmail.com' })

      expect(firestore.onSnapshot).toHaveBeenCalled()
    })

    it('should unsubscribe when user is not admin', () => {
      const unsubscribe = vi.fn()
      vi.mocked(firestore.onSnapshot).mockReturnValue(unsubscribe)

      user.set({ email: 'christophwieczorektest1@gmail.com' })
      expect(firestore.onSnapshot).toHaveBeenCalled()

      user.set({ email: 'regular-user@example.com' })

      // Verify unsubscribe was called
      expect(unsubscribe).toHaveBeenCalled()
    })
  })

  describe('Edge cases', () => {
    it('should handle user ID with special characters', async () => {
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await approveUser('user-with-dashes-123')

      expect(firestore.updateDoc).toHaveBeenCalled()
    })

    it('should handle rapid approval and rejection', async () => {
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await approveUser('user1')
      await rejectUser('user2')
      await approveUser('user3')
      await rejectUser('user4')

      expect(firestore.updateDoc).toHaveBeenCalledTimes(4)
    })

    it('should set correct timestamps for each operation', async () => {
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      const delayMs = 10

      await approveUser('user1')
      await new Promise(resolve => setTimeout(resolve, delayMs))
      await rejectUser('user2')

      const approvalTime = vi.mocked(firestore.updateDoc).mock.calls[0][1].approvedAt.getTime()
      const rejectionTime = vi.mocked(firestore.updateDoc).mock.calls[1][1].rejectedAt.getTime()

      expect(rejectionTime).toBeGreaterThanOrEqual(approvalTime)
    })
  })

  describe('Pending users store updates', () => {
    it('should update pendingUsers store when new pending users are fetched', () => {
      const mockUnsubscribe = vi.fn()
      vi.mocked(firestore.onSnapshot).mockImplementation((ref, callback) => {
        callback({
          docs: [
            { id: 'user1', data: () => ({ displayName: 'Alice', approvalStatus: 'pending' }) },
            { id: 'user2', data: () => ({ displayName: 'Bob', approvalStatus: 'pending' }) }
          ]
        })
        return mockUnsubscribe
      })

      user.set({ email: 'christophwieczorektest1@gmail.com' })

      const pendingList = get(pendingUsers)
      expect(pendingList).toHaveLength(2)
    })

    it('should clear pendingUsers when no pending users exist', () => {
      const mockUnsubscribe = vi.fn()
      vi.mocked(firestore.onSnapshot).mockImplementation((ref, callback) => {
        callback({ docs: [] })
        return mockUnsubscribe
      })

      user.set({ email: 'christophwieczorektest1@gmail.com' })

      expect(get(pendingUsers)).toEqual([])
    })

    it('should map firestore docs to pending users', () => {
      const mockUnsubscribe = vi.fn()
      const mockDocs = [
        {
          id: 'uid1',
          data: () => ({
            displayName: 'John Doe',
            email: 'john@example.com',
            approvalStatus: 'pending',
            createdAt: new Date()
          })
        }
      ]

      vi.mocked(firestore.onSnapshot).mockImplementation((ref, callback) => {
        callback({ docs: mockDocs })
        return mockUnsubscribe
      })

      user.set({ email: 'christophwieczorektest1@gmail.com' })

      const pending = get(pendingUsers)
      expect(pending).toHaveLength(1)
      expect(pending[0].id).toBe('uid1')
      expect(pending[0].displayName).toBe('John Doe')
      expect(pending[0].email).toBe('john@example.com')
    })
  })
})
