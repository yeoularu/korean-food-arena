import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient } from '../api-client'
import type { ExpandedCommentsResponse } from '../types'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('ApiClient - Expanded Comments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getExpandedComments', () => {
    const mockResponse: ExpandedCommentsResponse = {
      currentPairingComments: [
        {
          id: '1',
          pairKey: 'food1_food2',
          result: 'win',
          winnerFoodId: 'food1',
          content: 'Great food!',
          createdAt: '2024-01-01T00:00:00Z',
          nationality: 'US',
          isCurrentPairing: true,
          otherFoodId: 'food2',
          otherFoodName: 'Food 2',
        },
      ],
      expandedComments: [
        {
          id: '2',
          pairKey: 'food1_food3',
          result: 'win',
          winnerFoodId: 'food1',
          content: 'Also great!',
          createdAt: '2024-01-01T01:00:00Z',
          nationality: 'CA',
          isCurrentPairing: false,
          otherFoodId: 'food3',
          otherFoodName: 'Food 3',
        },
      ],
      totalCount: 2,
      hasMore: false,
    }

    it('should fetch expanded comments successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await apiClient.getExpandedComments(
        'food1_food2',
        'food1',
        'food2',
      )

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/comments/food1_food2/expanded?foodId1=food1&foodId2=food2',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          credentials: 'include',
        }),
      )
      expect(result).toEqual(mockResponse)
    })

    it('should include query parameters when options are provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      await apiClient.getExpandedComments('food1_food2', 'food1', 'food2', {
        currentPairingLimit: 5,
        expandedLimit: 10,
        includeExpanded: true,
        cursor: 'cursor123',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/comments/food1_food2/expanded?currentPairingLimit=5&expandedLimit=10&includeExpanded=true&cursor=cursor123&foodId1=food1&foodId2=food2',
        expect.any(Object),
      )
    })

    it('should validate and clamp limit parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      await apiClient.getExpandedComments('food1_food2', 'food1', 'food2', {
        currentPairingLimit: 50, // Should be clamped to 20
        expandedLimit: 100, // Should be clamped to 30
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/comments/food1_food2/expanded?currentPairingLimit=20&expandedLimit=30&foodId1=food1&foodId2=food2',
        expect.any(Object),
      )
    })

    it('should throw error for missing required parameters', async () => {
      await expect(
        apiClient.getExpandedComments('', 'food1', 'food2'),
      ).rejects.toThrow('Missing required parameters')

      await expect(
        apiClient.getExpandedComments('food1_food2', '', 'food2'),
      ).rejects.toThrow('Missing required parameters')

      await expect(
        apiClient.getExpandedComments('food1_food2', 'food1', ''),
      ).rejects.toThrow('Missing required parameters')
    })

    it('should validate pairKey format', async () => {
      await expect(
        apiClient.getExpandedComments('invalid-pair-key', 'food1', 'food2'),
      ).rejects.toThrow('Invalid pairKey format')

      await expect(
        apiClient.getExpandedComments('food1', 'food1', 'food2'),
      ).rejects.toThrow('Invalid pairKey format')
    })

    it('should provide specific error messages for HTTP status codes', async () => {
      // Test 403 Forbidden
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: () =>
          Promise.resolve({
            error: 'Forbidden',
            message: 'Access denied',
            code: 403,
          }),
      })

      await expect(
        apiClient.getExpandedComments('food1_food2', 'food1', 'food2'),
      ).rejects.toThrow('You must vote on this pairing before viewing comments')

      // Test 404 Not Found
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () =>
          Promise.resolve({
            error: 'Not Found',
            message: 'Resource not found',
            code: 404,
          }),
      })

      await expect(
        apiClient.getExpandedComments('food1_food2', 'food1', 'food2'),
      ).rejects.toThrow('Comments not found for this pairing')

      // Test 400 Bad Request
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () =>
          Promise.resolve({
            error: 'Bad Request',
            message: 'Invalid parameters',
            code: 400,
          }),
      })

      await expect(
        apiClient.getExpandedComments('food1_food2', 'food1', 'food2'),
      ).rejects.toThrow('Invalid request parameters')
    })

    it('should retry on network errors', async () => {
      // First two calls fail with network error
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })

      const result = await apiClient.getExpandedComments(
        'food1_food2',
        'food1',
        'food2',
      )

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(result).toEqual(mockResponse)
    })

    it('should retry on 5xx server errors', async () => {
      // First call fails with 500 error
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () =>
            Promise.resolve({
              error: 'Internal Server Error',
              message: 'Server error',
              code: 500,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })

      const result = await apiClient.getExpandedComments(
        'food1_food2',
        'food1',
        'food2',
      )

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual(mockResponse)
    })

    it('should not retry on 4xx client errors (except 408 and 429)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () =>
          Promise.resolve({
            error: 'Bad Request',
            message: 'Invalid parameters',
            code: 400,
          }),
      })

      await expect(
        apiClient.getExpandedComments('food1_food2', 'food1', 'food2'),
      ).rejects.toThrow('Invalid request parameters')

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should maintain backward compatibility with existing getComments method', async () => {
      const mockComments = [
        {
          id: '1',
          pairKey: 'food1_food2',
          result: 'win' as const,
          winnerFoodId: 'food1',
          content: 'Great food!',
          createdAt: '2024-01-01T00:00:00Z',
          nationality: 'US',
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockComments),
      })

      const result = await apiClient.getComments('food1_food2', 10)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/comments/food1_food2?limit=10',
        expect.any(Object),
      )
      expect(result).toEqual(mockComments)
    })
  })
})
