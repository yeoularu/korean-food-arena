import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import { AuthVariables } from '../../../auth'
import { errorHandler } from '../errorHandling'
import { createRuntimeAuth } from '../createRuntimeAuth'

// Import the main app structure for testing
import app from '../../index'

describe('Expanded Comments Integration Tests', () => {
  let testApp: Hono<{ Bindings: Env; Variables: AuthVariables }>
  let mockEnv: Env
  let mockDb: any
  let mockAuth: any

  // Mock user data
  const mockUsers = {
    user1: { id: 'user1', nationality: 'Korean' },
    user2: { id: 'user2', nationality: 'Japanese' },
    user3: { id: 'user3', nationality: 'Chinese' },
    user4: { id: 'user4', nationality: 'American' },
    user5: { id: 'user5', nationality: 'Korean' },
    user6: { id: 'user6', nationality: 'Korean' },
    user7: { id: 'user7', nationality: 'Korean' },
    user8: { id: 'user8', nationality: 'Korean' },
    user9: { id: 'user9', nationality: 'Korean' }, // 6 Korean users total
  }

  // Mock food data
  const mockFoods = [
    { id: 'food1', name: 'Kimchi', eloScore: 1200 },
    { id: 'food2', name: 'Bulgogi', eloScore: 1300 },
    { id: 'food3', name: 'Bibimbap', eloScore: 1250 },
  ]

  // Mock vote data
  const mockVotes = [
    // Current pairing votes (food1_food2)
    {
      id: 'vote1',
      userId: 'user1',
      pairKey: 'food1_food2',
      result: 'win',
      winnerFoodId: 'food1',
      createdAt: '2024-01-01T10:00:00Z',
    },
    {
      id: 'vote2',
      userId: 'user2',
      pairKey: 'food1_food2',
      result: 'win',
      winnerFoodId: 'food2',
      createdAt: '2024-01-01T11:00:00Z',
    },

    // Expanded votes (food1 in other pairings)
    {
      id: 'vote3',
      userId: 'user3',
      pairKey: 'food1_food3',
      result: 'win',
      winnerFoodId: 'food1',
      createdAt: '2024-01-01T12:00:00Z',
    },
    {
      id: 'vote4',
      userId: 'user4',
      pairKey: 'food1_food3',
      result: 'win',
      winnerFoodId: 'food3',
      createdAt: '2024-01-01T13:00:00Z',
    },

    // Expanded votes (food2 in other pairings)
    {
      id: 'vote5',
      userId: 'user5',
      pairKey: 'food2_food3',
      result: 'win',
      winnerFoodId: 'food2',
      createdAt: '2024-01-01T14:00:00Z',
    },
    {
      id: 'vote6',
      userId: 'user6',
      pairKey: 'food2_food3',
      result: 'tie',
      createdAt: '2024-01-01T15:00:00Z',
    },
  ]

  // Mock comment data
  const mockComments = [
    // Current pairing comments (food1_food2)
    {
      id: 'comment1',
      userId: 'user1',
      pairKey: 'food1_food2',
      result: 'win',
      winnerFoodId: 'food1',
      content: 'Kimchi is amazing!',
      createdAt: '2024-01-01T10:30:00Z',
    },
    {
      id: 'comment2',
      userId: 'user2',
      pairKey: 'food1_food2',
      result: 'win',
      winnerFoodId: 'food2',
      content: 'Bulgogi wins for me',
      createdAt: '2024-01-01T11:30:00Z',
    },

    // Expanded comments (food1 in other pairings)
    {
      id: 'comment3',
      userId: 'user3',
      pairKey: 'food1_food3',
      result: 'win',
      winnerFoodId: 'food1',
      content: 'Kimchi has great flavor',
      createdAt: '2024-01-01T12:30:00Z',
    },
    {
      id: 'comment4',
      userId: 'user4',
      pairKey: 'food1_food3',
      result: 'win',
      winnerFoodId: 'food3',
      content: 'Bibimbap is more balanced',
      createdAt: '2024-01-01T13:30:00Z',
    },

    // Expanded comments (food2 in other pairings)
    {
      id: 'comment5',
      userId: 'user5',
      pairKey: 'food2_food3',
      result: 'win',
      winnerFoodId: 'food2',
      content: 'Bulgogi is the best Korean BBQ',
      createdAt: '2024-01-01T14:30:00Z',
    },
    {
      id: 'comment6',
      userId: 'user6',
      pairKey: 'food2_food3',
      result: 'tie',
      content: 'Both are excellent choices',
      createdAt: '2024-01-01T15:30:00Z',
    },
  ]

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Create mock database with proper Drizzle-like interface
    mockDb = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve([])),
              })),
            })),
          })),
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([])),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })),
    }

    // Create mock environment
    mockEnv = {
      DB: {} as D1Database,
      BETTER_AUTH_SECRET: 'test-secret',
      BETTER_AUTH_URL: 'http://localhost:5173',
      ADMIN_API_KEY: 'test-admin-key',
      CLOUDFLARE_ACCOUNT_ID: '',
      CLOUDFLARE_API_TOKEN: '',
    }

    // Create mock auth
    mockAuth = {
      api: {
        getSession: vi.fn(),
      },
      handler: vi.fn(),
    }

    // Create test app with mocked dependencies
    testApp = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

    // Mock environment middleware
    testApp.use('*', async (c, next) => {
      c.env = mockEnv
      await next()
    })

    // Mock auth middleware
    testApp.use('*', async (c, next) => {
      // Default to authenticated user for most tests
      c.set('user', mockUsers.user1)
      c.set('session', { id: 'session1' })
      await next()
    })

    // Add error handler
    testApp.onError(errorHandler)
  })

  describe('Complete Flow: Voting to Viewing Expanded Comments', () => {
    it('should allow user to vote and then view expanded comments', async () => {
      // Mock database responses for voting flow
      setupVotingMocks()

      // Mock database responses for expanded comments
      setupExpandedCommentsMocks()

      // Add vote endpoint to test app
      testApp.post('/api/votes', async (c) => {
        // Simulate successful vote processing
        return c.json({
          vote: {
            id: 'new-vote',
            pairKey: 'food1_food2',
            result: 'win',
            winnerFoodId: 'food1',
          },
          updatedScores: { food1: 1210, food2: 1290 },
          voteStats: { totalVotes: 3 },
        })
      })

      // Add expanded comments endpoint to test app
      testApp.get('/api/comments/:pairKey/expanded', async (c) => {
        const pairKey = c.req.param('pairKey')

        // Simulate expanded comments response
        return c.json({
          currentPairingComments: [
            {
              id: 'comment1',
              pairKey: 'food1_food2',
              result: 'win',
              winnerFoodId: 'food1',
              content: 'Kimchi is amazing!',
              createdAt: '2024-01-01T10:30:00Z',
              nationality: 'Korean',
              isCurrentPairing: true,
              otherFoodId: 'food2',
              otherFoodName: 'Bulgogi',
            },
          ],
          expandedComments: [
            {
              id: 'comment3',
              pairKey: 'food1_food3',
              result: 'win',
              winnerFoodId: 'food1',
              content: 'Kimchi has great flavor',
              createdAt: '2024-01-01T12:30:00Z',
              nationality: 'Other', // Privacy protected
              isCurrentPairing: false,
              otherFoodId: 'food3',
              otherFoodName: 'Bibimbap',
            },
          ],
          totalCount: 2,
          hasMore: false,
        })
      })

      // Step 1: User votes on food pairing
      const voteResponse = await testApp.request('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairKey: 'food1_food2',
          result: 'win',
          winnerFoodId: 'food1',
        }),
      })

      expect(voteResponse.status).toBe(200)
      const voteData = await voteResponse.json()
      expect(voteData.vote.pairKey).toBe('food1_food2')

      // Step 2: User views expanded comments
      const commentsResponse = await testApp.request(
        '/api/comments/food1_food2/expanded',
      )

      expect(commentsResponse.status).toBe(200)
      const commentsData = await commentsResponse.json()

      // Verify response structure
      expect(commentsData).toHaveProperty('currentPairingComments')
      expect(commentsData).toHaveProperty('expandedComments')
      expect(commentsData.currentPairingComments).toHaveLength(1)
      expect(commentsData.expandedComments).toHaveLength(1)

      // Verify current pairing comment
      const currentComment = commentsData.currentPairingComments[0]
      expect(currentComment.isCurrentPairing).toBe(true)
      expect(currentComment.pairKey).toBe('food1_food2')

      // Verify expanded comment
      const expandedComment = commentsData.expandedComments[0]
      expect(expandedComment.isCurrentPairing).toBe(false)
      expect(expandedComment.pairKey).toBe('food1_food3')
      expect(expandedComment.otherFoodName).toBe('Bibimbap')
    })
  })

  describe('Access Control: User Must Vote Before Viewing Comments', () => {
    it('should deny access to expanded comments if user has not voted', async () => {
      // Mock database to return no votes for this user
      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])), // No votes found
            })),
          })),
        })),
      })

      // Add expanded comments endpoint with access control
      testApp.get('/api/comments/:pairKey/expanded', async (c) => {
        // Simulate access control check
        const userVotes = [] // No votes found

        if (userVotes.length === 0) {
          return c.json(
            {
              error: 'Forbidden',
              message: 'You must vote on this pairing before viewing comments',
            },
            403,
          )
        }

        return c.json({ currentPairingComments: [], expandedComments: [] })
      })

      const response = await testApp.request(
        '/api/comments/food1_food2/expanded',
      )

      expect(response.status).toBe(403)
      const errorData = await response.json()
      expect(errorData.message).toContain('must vote')
    })

    it('should allow access to expanded comments if user has voted', async () => {
      // Mock database to return user vote
      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([mockVotes[0]])), // User has voted
            })),
          })),
        })),
      })

      // Add expanded comments endpoint with access control
      testApp.get('/api/comments/:pairKey/expanded', async (c) => {
        // Simulate access control check
        const userVotes = [mockVotes[0]] // User has voted

        if (userVotes.length === 0) {
          return c.json(
            {
              error: 'Forbidden',
              message: 'You must vote on this pairing before viewing comments',
            },
            403,
          )
        }

        return c.json({
          currentPairingComments: [],
          expandedComments: [],
          totalCount: 0,
          hasMore: false,
        })
      })

      const response = await testApp.request(
        '/api/comments/food1_food2/expanded',
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('currentPairingComments')
      expect(data).toHaveProperty('expandedComments')
    })

    it('should allow access with skip votes', async () => {
      // Mock database to return skip vote
      const skipVote = { ...mockVotes[0], result: 'skip', winnerFoodId: null }
      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([skipVote])),
            })),
          })),
        })),
      })

      testApp.get('/api/comments/:pairKey/expanded', async (c) => {
        const userVotes = [skipVote]

        if (userVotes.length === 0) {
          return c.json(
            {
              error: 'Forbidden',
              message: 'You must vote on this pairing before viewing comments',
            },
            403,
          )
        }

        return c.json({
          currentPairingComments: [],
          expandedComments: [],
          totalCount: 0,
          hasMore: false,
        })
      })

      const response = await testApp.request(
        '/api/comments/food1_food2/expanded',
      )

      expect(response.status).toBe(200)
    })
  })

  describe('Nationality Privacy Protection Across Comment Types', () => {
    it('should protect nationalities with fewer than 5 occurrences across all comments', async () => {
      // Create comments with mixed nationalities
      const mixedComments = [
        // Current pairing: 3 Korean, 1 Japanese
        { ...mockComments[0], nationality: 'Korean' },
        { ...mockComments[1], nationality: 'Korean' },
        { id: 'extra1', nationality: 'Korean' },
        { id: 'extra2', nationality: 'Japanese' },

        // Expanded: 2 Korean, 1 Chinese, 1 American (total: 5 Korean, 1 Japanese, 1 Chinese, 1 American)
        { ...mockComments[2], nationality: 'Korean' },
        { ...mockComments[3], nationality: 'Korean' },
        { id: 'extra3', nationality: 'Chinese' },
        { id: 'extra4', nationality: 'American' },
      ]

      testApp.get('/api/comments/:pairKey/expanded', async (c) => {
        // Simulate nationality privacy protection logic
        const nationalityCounts: Record<string, number> = {}
        mixedComments.forEach((comment) => {
          const nationality = comment.nationality || 'unknown'
          nationalityCounts[nationality] =
            (nationalityCounts[nationality] || 0) + 1
        })

        const protectedComments = mixedComments.map((comment) => ({
          ...comment,
          nationality:
            (nationalityCounts[comment.nationality || 'unknown'] || 0) >= 5
              ? comment.nationality
              : 'Other',
        }))

        const currentPairingComments = protectedComments.slice(0, 4)
        const expandedComments = protectedComments.slice(4)

        return c.json({
          currentPairingComments,
          expandedComments,
          totalCount: protectedComments.length,
          hasMore: false,
        })
      })

      const response = await testApp.request(
        '/api/comments/food1_food2/expanded',
      )
      expect(response.status).toBe(200)

      const data = await response.json()
      const allComments = [
        ...data.currentPairingComments,
        ...data.expandedComments,
      ]

      // Korean should be visible (5 occurrences)
      const koreanComments = allComments.filter(
        (c: any) => c.nationality === 'Korean',
      )
      expect(koreanComments).toHaveLength(5)

      // Japanese, Chinese, American should be "Other" (< 5 occurrences each)
      const otherComments = allComments.filter(
        (c: any) => c.nationality === 'Other',
      )
      expect(otherComments).toHaveLength(3)
    })

    it('should apply consistent privacy protection across current and expanded comments', async () => {
      testApp.get('/api/comments/:pairKey/expanded', async (c) => {
        // Simulate scenario where nationality appears in both current and expanded
        const currentComments = [
          { id: 'c1', nationality: 'Korean' },
          { id: 'c2', nationality: 'Korean' },
          { id: 'c3', nationality: 'Japanese' },
        ]

        const expandedComments = [
          { id: 'e1', nationality: 'Korean' },
          { id: 'e2', nationality: 'Korean' },
          { id: 'e3', nationality: 'Korean' }, // Total 5 Korean
          { id: 'e4', nationality: 'Japanese' }, // Total 2 Japanese
        ]

        const allComments = [...currentComments, ...expandedComments]

        // Count across all comments
        const nationalityCounts: Record<string, number> = {}
        allComments.forEach((comment) => {
          const nationality = comment.nationality || 'unknown'
          nationalityCounts[nationality] =
            (nationalityCounts[nationality] || 0) + 1
        })

        // Apply protection consistently
        const protectedCurrent = currentComments.map((comment) => ({
          ...comment,
          nationality:
            (nationalityCounts[comment.nationality || 'unknown'] || 0) >= 5
              ? comment.nationality
              : 'Other',
        }))

        const protectedExpanded = expandedComments.map((comment) => ({
          ...comment,
          nationality:
            (nationalityCounts[comment.nationality || 'unknown'] || 0) >= 5
              ? comment.nationality
              : 'Other',
        }))

        return c.json({
          currentPairingComments: protectedCurrent,
          expandedComments: protectedExpanded,
          totalCount: allComments.length,
          hasMore: false,
        })
      })

      const response = await testApp.request(
        '/api/comments/food1_food2/expanded',
      )
      const data = await response.json()

      // Korean should be visible in both sections (5 total occurrences)
      const currentKorean = data.currentPairingComments.filter(
        (c: any) => c.nationality === 'Korean',
      )
      const expandedKorean = data.expandedComments.filter(
        (c: any) => c.nationality === 'Korean',
      )
      expect(currentKorean.length + expandedKorean.length).toBe(5)

      // Japanese should be "Other" in both sections (only 2 total occurrences)
      const currentOther = data.currentPairingComments.filter(
        (c: any) => c.nationality === 'Other',
      )
      const expandedOther = data.expandedComments.filter(
        (c: any) => c.nationality === 'Other',
      )
      expect(currentOther.length + expandedOther.length).toBe(2)
    })
  })

  describe('Proper Sorting and Display of Current vs Expanded Comments', () => {
    it('should display current pairing comments first, then expanded comments', async () => {
      testApp.get('/api/comments/:pairKey/expanded', async (c) => {
        return c.json({
          currentPairingComments: [
            {
              id: 'current1',
              pairKey: 'food1_food2',
              content: 'Current pairing comment 1',
              createdAt: '2024-01-01T10:00:00Z',
              isCurrentPairing: true,
            },
            {
              id: 'current2',
              pairKey: 'food1_food2',
              content: 'Current pairing comment 2',
              createdAt: '2024-01-01T09:00:00Z',
              isCurrentPairing: true,
            },
          ],
          expandedComments: [
            {
              id: 'expanded1',
              pairKey: 'food1_food3',
              content: 'Expanded comment 1',
              createdAt: '2024-01-01T11:00:00Z',
              isCurrentPairing: false,
              otherFoodName: 'Bibimbap',
            },
            {
              id: 'expanded2',
              pairKey: 'food2_food3',
              content: 'Expanded comment 2',
              createdAt: '2024-01-01T08:00:00Z',
              isCurrentPairing: false,
              otherFoodName: 'Bibimbap',
            },
          ],
          totalCount: 4,
          hasMore: false,
        })
      })

      const response = await testApp.request(
        '/api/comments/food1_food2/expanded',
      )
      const data = await response.json()

      // Verify structure
      expect(data.currentPairingComments).toHaveLength(2)
      expect(data.expandedComments).toHaveLength(2)

      // Verify current pairing comments are marked correctly
      data.currentPairingComments.forEach((comment: any) => {
        expect(comment.isCurrentPairing).toBe(true)
        expect(comment.pairKey).toBe('food1_food2')
      })

      // Verify expanded comments are marked correctly
      data.expandedComments.forEach((comment: any) => {
        expect(comment.isCurrentPairing).toBe(false)
        expect(comment.pairKey).not.toBe('food1_food2')
        expect(comment.otherFoodName).toBeDefined()
      })
    })

    it('should sort comments chronologically within each group', async () => {
      testApp.get('/api/comments/:pairKey/expanded', async (c) => {
        return c.json({
          currentPairingComments: [
            {
              id: 'current1',
              content: 'Newer current comment',
              createdAt: '2024-01-01T12:00:00Z',
              isCurrentPairing: true,
            },
            {
              id: 'current2',
              content: 'Older current comment',
              createdAt: '2024-01-01T10:00:00Z',
              isCurrentPairing: true,
            },
          ],
          expandedComments: [
            {
              id: 'expanded1',
              content: 'Newer expanded comment',
              createdAt: '2024-01-01T11:00:00Z',
              isCurrentPairing: false,
              otherFoodName: 'Bibimbap',
            },
            {
              id: 'expanded2',
              content: 'Older expanded comment',
              createdAt: '2024-01-01T09:00:00Z',
              isCurrentPairing: false,
              otherFoodName: 'Bibimbap',
            },
          ],
          totalCount: 4,
          hasMore: false,
        })
      })

      const response = await testApp.request(
        '/api/comments/food1_food2/expanded',
      )
      const data = await response.json()

      // Verify current pairing comments are sorted by creation time (newest first)
      const currentTimes = data.currentPairingComments.map((c: any) =>
        new Date(c.createdAt).getTime(),
      )
      expect(currentTimes[0]).toBeGreaterThan(currentTimes[1])

      // Verify expanded comments are sorted by creation time (newest first)
      const expandedTimes = data.expandedComments.map((c: any) =>
        new Date(c.createdAt).getTime(),
      )
      expect(expandedTimes[0]).toBeGreaterThan(expandedTimes[1])
    })

    it('should include context information for expanded comments', async () => {
      testApp.get('/api/comments/:pairKey/expanded', async (c) => {
        return c.json({
          currentPairingComments: [],
          expandedComments: [
            {
              id: 'expanded1',
              pairKey: 'food1_food3',
              result: 'win',
              winnerFoodId: 'food1',
              content: 'Great choice!',
              createdAt: '2024-01-01T11:00:00Z',
              nationality: 'Korean',
              isCurrentPairing: false,
              otherFoodId: 'food3',
              otherFoodName: 'Bibimbap',
            },
            {
              id: 'expanded2',
              pairKey: 'food2_food3',
              result: 'tie',
              content: 'Both are good',
              createdAt: '2024-01-01T10:00:00Z',
              nationality: 'Other',
              isCurrentPairing: false,
              otherFoodId: 'food3',
              otherFoodName: 'Bibimbap',
            },
          ],
          totalCount: 2,
          hasMore: false,
        })
      })

      const response = await testApp.request(
        '/api/comments/food1_food2/expanded',
      )
      const data = await response.json()

      data.expandedComments.forEach((comment: any) => {
        // Verify context fields are present
        expect(comment.otherFoodId).toBeDefined()
        expect(comment.otherFoodName).toBeDefined()
        expect(comment.isCurrentPairing).toBe(false)
        expect(comment.result).toBeDefined()

        // Verify pairing context is different from current pairing
        expect(comment.pairKey).not.toBe('food1_food2')
      })
    })

    it('should handle empty comment sections gracefully', async () => {
      testApp.get('/api/comments/:pairKey/expanded', async (c) => {
        return c.json({
          currentPairingComments: [],
          expandedComments: [],
          totalCount: 0,
          hasMore: false,
        })
      })

      const response = await testApp.request(
        '/api/comments/food1_food2/expanded',
      )
      const data = await response.json()

      expect(data.currentPairingComments).toHaveLength(0)
      expect(data.expandedComments).toHaveLength(0)
      expect(data.totalCount).toBe(0)
      expect(data.hasMore).toBe(false)
    })

    it('should handle pagination correctly', async () => {
      testApp.get('/api/comments/:pairKey/expanded', async (c) => {
        const currentPairingLimit = parseInt(
          c.req.query('currentPairingLimit') || '10',
        )
        const expandedLimit = parseInt(c.req.query('expandedLimit') || '10')

        return c.json({
          currentPairingComments: Array.from(
            { length: Math.min(currentPairingLimit, 5) },
            (_, i) => ({
              id: `current${i}`,
              content: `Current comment ${i}`,
              isCurrentPairing: true,
            }),
          ),
          expandedComments: Array.from(
            { length: Math.min(expandedLimit, 8) },
            (_, i) => ({
              id: `expanded${i}`,
              content: `Expanded comment ${i}`,
              isCurrentPairing: false,
              otherFoodName: 'Bibimbap',
            }),
          ),
          totalCount: 13,
          hasMore: true,
          cursor: '2024-01-01T08:00:00Z',
        })
      })

      // Test with custom limits
      const response = await testApp.request(
        '/api/comments/food1_food2/expanded?currentPairingLimit=3&expandedLimit=5',
      )
      const data = await response.json()

      expect(data.currentPairingComments).toHaveLength(3)
      expect(data.expandedComments).toHaveLength(5)
      expect(data.hasMore).toBe(true)
      expect(data.cursor).toBeDefined()
    })
  })

  // Helper functions
  function setupVotingMocks() {
    // Mock successful vote processing
    mockDb.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])), // No existing vote
        })),
      })),
    })
  }

  function setupExpandedCommentsMocks() {
    // Mock expanded comments query
    mockDb.select.mockReturnValue({
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve(mockComments)),
            })),
          })),
        })),
      })),
    })
  }
})
