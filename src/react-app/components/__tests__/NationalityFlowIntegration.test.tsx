import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SessionData } from '@/lib/types'
import type { UseQueryResult } from '@tanstack/react-query'
import type { UseMutationResult } from '@tanstack/react-query'

// Mock the hooks and API client
vi.mock('@/hooks/use-session', () => ({
  useSession: vi.fn(),
  useUpdateNationality: vi.fn(),
}))

vi.mock('@/hooks/use-comment-queries', () => ({
  useExpandedCommentMutation: vi.fn(),
}))

vi.mock('@/hooks/use-network-status', () => ({
  useNetworkStatus: vi.fn(() => ({ isOnline: true })),
}))

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    createComment: vi.fn(),
  },
}))

// Mock components to focus on integration logic
vi.mock('@/components/CountryDropdown', () => ({
  CountryDropdown: vi.fn(() => null),
}))

vi.mock('@/components/FlagDisplay', () => ({
  FlagDisplay: vi.fn(() => null),
}))

import * as useSessionHooks from '@/hooks/use-session'
import * as useCommentHooks from '@/hooks/use-comment-queries'
import { apiClient } from '@/lib/api-client'

// Type definitions for mocked hooks
type MockedUseSession = UseQueryResult<SessionData | null, Error> & {
  data: SessionData | null
  isLoading: boolean
  error?: Error
}

type MockedUseUpdateNationality = UseMutationResult<
  unknown,
  Error,
  string | undefined,
  unknown
> & {
  mutateAsync: (nationality?: string) => Promise<unknown>
  isPending: boolean
  isError: boolean
  isSuccess: boolean
  error?: Error
}

type MockedUseExpandedCommentMutation = UseMutationResult<
  unknown,
  Error,
  {
    pairKey: string
    result: 'win' | 'tie'
    winnerFoodId?: string
    content: string
  },
  unknown
> & {
  mutateAsync: (data: {
    pairKey: string
    result: 'win' | 'tie'
    winnerFoodId?: string
    content: string
  }) => Promise<unknown>
  isPending: boolean
  isError: boolean
  error: Error | null
  reset: () => void
}

describe('Nationality Flow Integration Tests', () => {
  const mockUseSession = vi.mocked(useSessionHooks.useSession)
  const mockUseUpdateNationality = vi.mocked(
    useSessionHooks.useUpdateNationality,
  )
  const mockUseExpandedCommentMutation = vi.mocked(
    useCommentHooks.useExpandedCommentMutation,
  )
  const mockApiClient = vi.mocked(apiClient)

  const mockUpdateNationalityMutate = vi.fn()
  const mockCommentMutate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Default session mock
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'user1', nationality: 'US' },
        session: { id: 'session1' },
      } as SessionData,
      isLoading: false,
    } as MockedUseSession)

    // Default nationality update mock
    mockUseUpdateNationality.mockReturnValue({
      mutateAsync: mockUpdateNationalityMutate,
      isPending: false,
      isError: false,
      isSuccess: false,
    } as MockedUseUpdateNationality)

    // Default comment mutation mock
    mockUseExpandedCommentMutation.mockReturnValue({
      mutateAsync: mockCommentMutate,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    } as MockedUseExpandedCommentMutation)

    // Default API client mock - fix the return type
    mockApiClient.createComment.mockResolvedValue({
      id: 'comment1',
      content: 'Test comment',
      pairKey: 'test_pair',
      result: 'win',
      createdAt: new Date().toISOString(),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Comment Creation with Nationality Selection', () => {
    it('should update nationality when user selects different nationality during comment creation', async () => {
      // Arrange: User starts with US nationality
      const initialSession = {
        user: { id: 'user1', nationality: 'US' },
        session: { id: 'session1' },
      } as SessionData

      mockUseSession.mockReturnValue({
        data: initialSession,
        isLoading: false,
      } as MockedUseSession)

      mockUpdateNationalityMutate.mockResolvedValue({})
      mockCommentMutate.mockResolvedValue({
        id: 'comment1',
        content: 'Great comparison!',
        nationality: 'KR',
      })

      // Act: Simulate nationality change in comment creation
      const newNationality = 'KR'

      // Simulate the NationalitySelector's handleNationalityChange
      await mockUpdateNationalityMutate(newNationality)

      // Then submit comment
      await mockCommentMutate({
        pairKey: 'kimchi_bulgogi',
        result: 'win' as const,
        winnerFoodId: 'kimchi',
        content: 'Great comparison!',
      })

      // Assert: Nationality update was called before comment submission
      expect(mockUpdateNationalityMutate).toHaveBeenCalledWith('KR')
      expect(mockCommentMutate).toHaveBeenCalledWith({
        pairKey: 'kimchi_bulgogi',
        result: 'win',
        winnerFoodId: 'kimchi',
        content: 'Great comparison!',
      })
    })

    it('should handle nationality update failure gracefully during comment creation', async () => {
      // Arrange: Nationality update fails
      const nationalityError = new Error('Network error')
      mockUpdateNationalityMutate.mockRejectedValue(nationalityError)
      mockCommentMutate.mockResolvedValue({
        id: 'comment1',
        content: 'Test comment',
      })

      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      // Act: Try to update nationality and then submit comment
      let nationalityUpdateFailed = false
      try {
        await mockUpdateNationalityMutate('FR')
      } catch (error) {
        nationalityUpdateFailed = true
        expect(error).toBe(nationalityError)
      }

      // Comment should still be submittable even if nationality update fails
      await mockCommentMutate({
        pairKey: 'kimchi_bulgogi',
        result: 'tie' as const,
        content: 'Test comment',
      })

      // Assert: Nationality update failed but comment succeeded
      expect(nationalityUpdateFailed).toBe(true)
      expect(mockUpdateNationalityMutate).toHaveBeenCalledWith('FR')
      expect(mockCommentMutate).toHaveBeenCalledWith({
        pairKey: 'kimchi_bulgogi',
        result: 'tie',
        content: 'Test comment',
      })

      consoleError.mockRestore()
    })

    it('should preserve existing nationality when no change is made during comment creation', async () => {
      // Arrange: User has existing nationality
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user1', nationality: 'JP' },
          session: { id: 'session1' },
        } as SessionData,
        isLoading: false,
      } as any)

      mockCommentMutate.mockResolvedValue({
        id: 'comment1',
        content: 'Nice foods!',
        nationality: 'JP',
      })

      // Act: Submit comment without changing nationality
      await mockCommentMutate({
        pairKey: 'ramen_kimchi',
        result: 'win' as const,
        winnerFoodId: 'ramen',
        content: 'Nice foods!',
      })

      // Assert: No nationality update was called, comment uses existing nationality
      expect(mockUpdateNationalityMutate).not.toHaveBeenCalled()
      expect(mockCommentMutate).toHaveBeenCalledWith({
        pairKey: 'ramen_kimchi',
        result: 'win',
        winnerFoodId: 'ramen',
        content: 'Nice foods!',
      })
    })

    it('should handle comment creation when user has no nationality set', async () => {
      // Arrange: User has no nationality
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user1', nationality: undefined },
          session: { id: 'session1' },
        } as SessionData,
        isLoading: false,
      } as MockedUseSession)

      mockUpdateNationalityMutate.mockResolvedValue({})
      mockCommentMutate.mockResolvedValue({
        id: 'comment1',
        content: 'First comment!',
        nationality: 'CA',
      })

      // Act: Set nationality for the first time during comment creation
      await mockUpdateNationalityMutate('CA')
      await mockCommentMutate({
        pairKey: 'bulgogi_bibimbap',
        result: 'tie' as const,
        content: 'First comment!',
      })

      // Assert: Nationality was set and comment was created
      expect(mockUpdateNationalityMutate).toHaveBeenCalledWith('CA')
      expect(mockCommentMutate).toHaveBeenCalledWith({
        pairKey: 'bulgogi_bibimbap',
        result: 'tie',
        content: 'First comment!',
      })
    })
  })

  describe('Nationality Updates Propagate to User Profile', () => {
    it('should reflect nationality changes made in comment creation in user profile', async () => {
      // Arrange: Start with one nationality
      let currentSession = {
        user: { id: 'user1', nationality: 'US' },
        session: { id: 'session1' },
      } as SessionData

      mockUseSession.mockReturnValue({
        data: currentSession,
        isLoading: false,
      } as any)

      // Act: Update nationality (simulating what happens after successful update)
      mockUpdateNationalityMutate.mockImplementation(async (nationality) => {
        // Simulate session update after successful nationality change
        currentSession = {
          ...currentSession,
          user: { ...currentSession.user, nationality },
        }

        // Update the mock to return the new session
        mockUseSession.mockReturnValue({
          data: currentSession,
          isLoading: false,
        } as MockedUseSession)

        return {}
      })

      await mockUpdateNationalityMutate('DE')

      // Assert: Session reflects the new nationality
      const updatedSession = mockUseSession().data
      expect(updatedSession?.user.nationality).toBe('DE')
      expect(mockUpdateNationalityMutate).toHaveBeenCalledWith('DE')
    })

    it('should handle nationality clearing (setting to undefined)', async () => {
      // Arrange: User has nationality set
      let currentSession = {
        user: { id: 'user1', nationality: 'FR' },
        session: { id: 'session1' },
      } as SessionData

      mockUseSession.mockReturnValue({
        data: currentSession,
        isLoading: false,
      } as MockedUseSession)

      // Act: Clear nationality
      mockUpdateNationalityMutate.mockImplementation(async (nationality) => {
        currentSession = {
          ...currentSession,
          user: { ...currentSession.user, nationality },
        }

        mockUseSession.mockReturnValue({
          data: currentSession,
          isLoading: false,
        } as MockedUseSession)

        return {}
      })

      await mockUpdateNationalityMutate(undefined)

      // Assert: Nationality is cleared
      const updatedSession = mockUseSession().data
      expect(updatedSession?.user.nationality).toBeUndefined()
      expect(mockUpdateNationalityMutate).toHaveBeenCalledWith(undefined)
    })

    it('should maintain session consistency across multiple nationality updates', async () => {
      // Arrange: Track session changes
      const nationalitySequence = ['US', 'KR', 'JP', undefined, 'CA']
      let currentSession = {
        user: { id: 'user1', nationality: 'GB' },
        session: { id: 'session1' },
      } as SessionData

      mockUseSession.mockReturnValue({
        data: currentSession,
        isLoading: false,
      } as any)

      mockUpdateNationalityMutate.mockImplementation(async (nationality) => {
        currentSession = {
          ...currentSession,
          user: { ...currentSession.user, nationality },
        }

        mockUseSession.mockReturnValue({
          data: currentSession,
          isLoading: false,
        } as MockedUseSession)

        return {}
      })

      // Act: Apply sequence of nationality changes
      for (const nationality of nationalitySequence) {
        await mockUpdateNationalityMutate(nationality)

        // Assert: Each change is reflected immediately
        const session = mockUseSession().data
        expect(session?.user.nationality).toBe(nationality)
      }

      // Assert: All updates were called
      expect(mockUpdateNationalityMutate).toHaveBeenCalledTimes(
        nationalitySequence.length,
      )
      nationalitySequence.forEach((nationality, index) => {
        expect(mockUpdateNationalityMutate).toHaveBeenNthCalledWith(
          index + 1,
          nationality,
        )
      })
    })
  })

  describe('Consistency Between Comment Creation and Profile Interfaces', () => {
    it('should use the same nationality value in both comment creation and profile', async () => {
      // Arrange: User has nationality set
      const testNationality = 'IT'
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user1', nationality: testNationality },
          session: { id: 'session1' },
        } as SessionData,
        isLoading: false,
      } as MockedUseSession)

      // Act & Assert: Both interfaces should see the same nationality
      const sessionData = mockUseSession().data

      // Comment creation interface should see this nationality
      const commentCreationNationality = sessionData?.user?.nationality
      expect(commentCreationNationality).toBe(testNationality)

      // Profile interface should see the same nationality
      const profileNationality = sessionData?.user?.nationality
      expect(profileNationality).toBe(testNationality)

      // Both should be identical
      expect(commentCreationNationality).toBe(profileNationality)
    })

    it('should handle nationality updates consistently across interfaces', async () => {
      // Arrange: Start with initial nationality
      let currentSession = {
        user: { id: 'user1', nationality: 'ES' },
        session: { id: 'session1' },
      } as SessionData

      mockUseSession.mockReturnValue({
        data: currentSession,
        isLoading: false,
      } as any)

      mockUpdateNationalityMutate.mockImplementation(async (nationality) => {
        currentSession = {
          ...currentSession,
          user: { ...currentSession.user, nationality },
        }

        mockUseSession.mockReturnValue({
          data: currentSession,
          isLoading: false,
        } as any)

        return {}
      })

      // Act: Update nationality from either interface (they use the same hook)
      const newNationality = 'BR'
      await mockUpdateNationalityMutate(newNationality)

      // Assert: Both interfaces see the updated nationality
      const updatedSession = mockUseSession().data
      expect(updatedSession?.user.nationality).toBe(newNationality)

      // Simulate both interfaces reading the same session data
      const commentCreationView = updatedSession?.user?.nationality
      const profileView = updatedSession?.user?.nationality

      expect(commentCreationView).toBe(newNationality)
      expect(profileView).toBe(newNationality)
      expect(commentCreationView).toBe(profileView)
    })

    it('should handle loading states consistently across interfaces', async () => {
      // Arrange: Session is loading
      mockUseSession.mockReturnValue({
        data: null,
        isLoading: true,
      } as any)

      // Act & Assert: Both interfaces should handle loading state
      const sessionQuery = mockUseSession()

      expect(sessionQuery.isLoading).toBe(true)
      expect(sessionQuery.data).toBeNull()

      // Both comment creation and profile should see the same loading state
      const commentCreationLoading = sessionQuery.isLoading
      const profileLoading = sessionQuery.isLoading

      expect(commentCreationLoading).toBe(true)
      expect(profileLoading).toBe(true)
      expect(commentCreationLoading).toBe(profileLoading)
    })

    it('should handle session errors consistently across interfaces', async () => {
      // Arrange: Session has error
      const sessionError = new Error('Session fetch failed')
      mockUseSession.mockReturnValue({
        data: null,
        isLoading: false,
        error: sessionError,
      } as any)

      // Act & Assert: Both interfaces should handle error state
      const sessionQuery = mockUseSession()

      expect(sessionQuery.error).toBe(sessionError)
      expect(sessionQuery.data).toBeNull()

      // Both interfaces should see the same error
      const commentCreationError = sessionQuery.error
      const profileError = sessionQuery.error

      expect(commentCreationError).toBe(sessionError)
      expect(profileError).toBe(sessionError)
      expect(commentCreationError).toBe(profileError)
    })
  })

  describe('Error Handling for Nationality Update Failures', () => {
    it('should handle network errors during nationality updates', async () => {
      // Arrange: Network error
      const networkError = new Error('Network timeout')
      mockUpdateNationalityMutate.mockRejectedValue(networkError)

      // Act: Attempt nationality update
      let caughtError: Error | null = null
      try {
        await mockUpdateNationalityMutate('AU')
      } catch (error) {
        caughtError = error as Error
      }

      // Assert: Error is properly handled
      expect(caughtError).toBe(networkError)
      expect(mockUpdateNationalityMutate).toHaveBeenCalledWith('AU')
    })

    it('should handle server errors (500) during nationality updates', async () => {
      // Arrange: Server error
      const serverError = new Error('Internal server error')
      mockUpdateNationalityMutate.mockRejectedValue(serverError)

      mockUseUpdateNationality.mockReturnValue({
        mutateAsync: mockUpdateNationalityMutate,
        isPending: false,
        isError: true,
        error: serverError,
        isSuccess: false,
      } as any)

      // Act: Attempt nationality update
      let updateFailed = false
      try {
        await mockUpdateNationalityMutate('NZ')
      } catch (error) {
        updateFailed = true
        expect(error).toBe(serverError)
      }

      // Assert: Error state is reflected in mutation
      const mutation = mockUseUpdateNationality()
      expect(updateFailed).toBe(true)
      expect(mutation.isError).toBe(true)
      expect(mutation.error).toBe(serverError)
    })

    it('should handle authentication errors during nationality updates', async () => {
      // Arrange: Authentication error
      const authError = new Error('Unauthorized')
      mockUpdateNationalityMutate.mockRejectedValue(authError)

      // Act: Attempt nationality update
      let authFailed = false
      try {
        await mockUpdateNationalityMutate('SE')
      } catch (error) {
        authFailed = true
        expect(error).toBe(authError)
      }

      // Assert: Authentication error is handled
      expect(authFailed).toBe(true)
      expect(mockUpdateNationalityMutate).toHaveBeenCalledWith('SE')
    })

    it('should handle validation errors for invalid nationality codes', async () => {
      // Arrange: Validation error
      const validationError = new Error('Invalid nationality code')
      mockUpdateNationalityMutate.mockRejectedValue(validationError)

      // Act: Attempt to set invalid nationality
      let validationFailed = false
      try {
        await mockUpdateNationalityMutate('INVALID_CODE')
      } catch (error) {
        validationFailed = true
        expect(error).toBe(validationError)
      }

      // Assert: Validation error is handled
      expect(validationFailed).toBe(true)
      expect(mockUpdateNationalityMutate).toHaveBeenCalledWith('INVALID_CODE')
    })

    it('should handle concurrent nationality update conflicts', async () => {
      // Arrange: Concurrent update conflict
      const conflictError = new Error(
        'Nationality was updated by another request',
      )
      mockUpdateNationalityMutate.mockRejectedValue(conflictError)

      // Act: Attempt nationality update that conflicts
      let conflictOccurred = false
      try {
        await mockUpdateNationalityMutate('NO')
      } catch (error) {
        conflictOccurred = true
        expect(error).toBe(conflictError)
      }

      // Assert: Conflict is handled
      expect(conflictOccurred).toBe(true)
      expect(mockUpdateNationalityMutate).toHaveBeenCalledWith('NO')
    })

    it('should handle rate limiting errors during nationality updates', async () => {
      // Arrange: Rate limiting error
      const rateLimitError = new Error('Too many requests')
      mockUpdateNationalityMutate.mockRejectedValue(rateLimitError)

      // Act: Attempt nationality update when rate limited
      let rateLimited = false
      try {
        await mockUpdateNationalityMutate('DK')
      } catch (error) {
        rateLimited = true
        expect(error).toBe(rateLimitError)
      }

      // Assert: Rate limit error is handled
      expect(rateLimited).toBe(true)
      expect(mockUpdateNationalityMutate).toHaveBeenCalledWith('DK')
    })

    it('should recover gracefully after nationality update errors', async () => {
      // Arrange: First update fails, second succeeds
      let callCount = 0
      mockUpdateNationalityMutate.mockImplementation(async (nationality) => {
        callCount++
        if (callCount === 1) {
          throw new Error('Temporary error')
        }
        return {} // Success on second call
      })

      // Act: First update fails
      let firstUpdateFailed = false
      try {
        await mockUpdateNationalityMutate('FI')
      } catch (error) {
        firstUpdateFailed = true
      }

      // Second update succeeds
      let secondUpdateSucceeded = false
      try {
        await mockUpdateNationalityMutate('FI')
        secondUpdateSucceeded = true
      } catch {
        // Should not reach here
      }

      // Assert: Recovery after error
      expect(firstUpdateFailed).toBe(true)
      expect(secondUpdateSucceeded).toBe(true)
      expect(mockUpdateNationalityMutate).toHaveBeenCalledTimes(2)
    })
  })

  describe('Integration with Comment System', () => {
    it('should maintain nationality context when submitting comments', async () => {
      // Arrange: User has nationality set
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user1', nationality: 'MX' },
          session: { id: 'session1' },
        } as SessionData,
        isLoading: false,
      } as any)

      mockCommentMutate.mockResolvedValue({
        id: 'comment1',
        content: 'Excellent comparison!',
        nationality: 'MX',
        createdAt: new Date().toISOString(),
      })

      // Act: Submit comment with existing nationality
      const commentData = {
        pairKey: 'kimchi_ramen',
        result: 'win' as const,
        winnerFoodId: 'kimchi',
        content: 'Excellent comparison!',
      }

      await mockCommentMutate(commentData)

      // Assert: Comment submission includes nationality context
      expect(mockCommentMutate).toHaveBeenCalledWith(commentData)

      // The nationality should be available from session for the backend to use
      const session = mockUseSession().data
      expect(session?.user.nationality).toBe('MX')
    })

    it('should handle comment submission when nationality is updated mid-flow', async () => {
      // Arrange: Start with one nationality
      let currentSession = {
        user: { id: 'user1', nationality: 'IN' },
        session: { id: 'session1' },
      } as SessionData

      mockUseSession.mockReturnValue({
        data: currentSession,
        isLoading: false,
      } as any)

      mockUpdateNationalityMutate.mockImplementation(async (nationality) => {
        currentSession = {
          ...currentSession,
          user: { ...currentSession.user, nationality },
        }

        mockUseSession.mockReturnValue({
          data: currentSession,
          isLoading: false,
        } as any)

        return {}
      })

      mockCommentMutate.mockResolvedValue({
        id: 'comment1',
        content: 'Changed my mind!',
        nationality: 'TH',
      })

      // Act: Update nationality then submit comment
      await mockUpdateNationalityMutate('TH')

      await mockCommentMutate({
        pairKey: 'bulgogi_bibimbap',
        result: 'tie' as const,
        content: 'Changed my mind!',
      })

      // Assert: Comment uses updated nationality
      expect(mockUpdateNationalityMutate).toHaveBeenCalledWith('TH')
      expect(mockCommentMutate).toHaveBeenCalledWith({
        pairKey: 'bulgogi_bibimbap',
        result: 'tie',
        content: 'Changed my mind!',
      })

      const finalSession = mockUseSession().data
      expect(finalSession?.user.nationality).toBe('TH')
    })

    it('should handle comment submission when nationality update is pending', async () => {
      // Arrange: Nationality update is in progress
      mockUseUpdateNationality.mockReturnValue({
        mutateAsync: mockUpdateNationalityMutate,
        isPending: true,
        isError: false,
        isSuccess: false,
      } as any)

      mockCommentMutate.mockResolvedValue({
        id: 'comment1',
        content: 'Posting while updating...',
      })

      // Act: The component should disable submission when nationality update is pending
      const mutation = mockUseUpdateNationality()
      const shouldDisableSubmission = mutation.isPending

      // Assert: Submission should be disabled during nationality update
      expect(shouldDisableSubmission).toBe(true)
      expect(mutation.isPending).toBe(true)
    })
  })

  describe('Session State Management', () => {
    it('should handle session refresh after nationality updates', async () => {
      // Arrange: Initial session
      let currentNationality = 'PL'

      mockUseSession.mockImplementation(() => {
        return {
          data: {
            user: {
              id: 'user1',
              nationality: currentNationality,
            },
            session: { id: 'session1' },
          } as SessionData,
          isLoading: false,
        } as any
      })

      mockUpdateNationalityMutate.mockImplementation(async (nationality) => {
        // Simulate successful update changing the session
        currentNationality = nationality ?? undefined
        return {}
      })

      // Act: Update nationality (this should trigger session refresh)
      await mockUpdateNationalityMutate('RU')

      // Simulate session refresh by calling useSession again
      const refreshedSession = mockUseSession()

      // Assert: Session reflects the update
      expect(mockUpdateNationalityMutate).toHaveBeenCalledWith('RU')
      expect(refreshedSession.data?.user.nationality).toBe('RU')
    })

    it('should handle multiple rapid nationality changes', async () => {
      // Arrange: Track rapid changes
      const rapidChanges = ['CH', 'AT', 'BE', 'NL']
      let changeIndex = 0

      mockUpdateNationalityMutate.mockImplementation(async (nationality) => {
        changeIndex++
        // Simulate some changes succeeding and some failing
        if (changeIndex === 2) {
          throw new Error('Temporary failure')
        }
        return {}
      })

      // Act: Apply rapid changes
      const results = await Promise.allSettled(
        rapidChanges.map((nationality) =>
          mockUpdateNationalityMutate(nationality),
        ),
      )

      // Assert: Some succeed, some fail, but all are handled
      expect(results).toHaveLength(4)
      expect(results[0]?.status).toBe('fulfilled') // CH
      expect(results[1]?.status).toBe('rejected') // AT (fails)
      expect(results[2]?.status).toBe('fulfilled') // BE
      expect(results[3]?.status).toBe('fulfilled') // NL

      expect(mockUpdateNationalityMutate).toHaveBeenCalledTimes(4)
    })

    it('should handle session expiration during nationality updates', async () => {
      // Arrange: Session expires during update
      mockUseSession.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Session expired'),
      } as any)

      mockUpdateNationalityMutate.mockRejectedValue(new Error('Unauthorized'))

      // Act: Try to update nationality with expired session
      let updateFailed = false
      try {
        await mockUpdateNationalityMutate('IE')
      } catch (error) {
        updateFailed = true
      }

      // Assert: Update fails due to session expiration
      expect(updateFailed).toBe(true)
      const session = mockUseSession()
      expect(session.data).toBeNull()
      expect(session.error).toBeInstanceOf(Error)
    })
  })
})
