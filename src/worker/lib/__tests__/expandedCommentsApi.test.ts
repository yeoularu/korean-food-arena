import { describe, it, expect } from 'vitest'
import { ExpandedCommentsQuerySchema } from '../validation'

describe('Expanded Comments API Integration', () => {
  describe('ExpandedCommentsQuerySchema validation', () => {
    it('should validate query parameters correctly', () => {
      const validParams = {
        currentPairingLimit: '5',
        expandedLimit: '15',
        includeExpanded: 'true',
        cursor: 'some-cursor',
      }

      const result = ExpandedCommentsQuerySchema.safeParse(validParams)
      expect(result.success).toBe(true)

      if (result.success) {
        expect(result.data.currentPairingLimit).toBe(5)
        expect(result.data.expandedLimit).toBe(15)
        expect(result.data.includeExpanded).toBe(true)
        expect(result.data.cursor).toBe('some-cursor')
      }
    })

    it('should handle missing parameters with defaults', () => {
      const result = ExpandedCommentsQuerySchema.safeParse({})
      expect(result.success).toBe(true)

      if (result.success) {
        expect(result.data.currentPairingLimit).toBe(10)
        expect(result.data.expandedLimit).toBe(10)
        expect(result.data.includeExpanded).toBe(true)
      }
    })

    it('should reject invalid limits', () => {
      const invalidParams = {
        currentPairingLimit: '25', // exceeds max of 20
        expandedLimit: '35', // exceeds max of 30
      }

      const result = ExpandedCommentsQuerySchema.safeParse(invalidParams)
      expect(result.success).toBe(false)
    })
  })
})
