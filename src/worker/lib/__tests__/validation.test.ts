import { describe, it, expect } from 'vitest'
import {
  VoteRequestSchema,
  CommentRequestSchema,
  UpdateNationalitySchema,
  PaginationQuerySchema,
  sanitizeContent,
  formatValidationError,
} from '../validation'
import { z } from 'zod'

describe('VoteRequestSchema', () => {
  it('should validate a valid vote request', () => {
    const validVote = {
      pairKey: 'food1_food2',
      foodLowId: 'food1',
      foodHighId: 'food2',
      presentedLeftId: 'food1',
      presentedRightId: 'food2',
      result: 'win' as const,
      winnerFoodId: 'food1',
    }

    const result = VoteRequestSchema.safeParse(validVote)
    expect(result.success).toBe(true)
  })

  it('should require winnerFoodId for win results', () => {
    const invalidVote = {
      pairKey: 'food1_food2',
      foodLowId: 'food1',
      foodHighId: 'food2',
      presentedLeftId: 'food1',
      presentedRightId: 'food2',
      result: 'win' as const,
      // Missing winnerFoodId
    }

    const result = VoteRequestSchema.safeParse(invalidVote)
    expect(result.success).toBe(false)
  })

  it('should not allow winnerFoodId for tie results', () => {
    const invalidVote = {
      pairKey: 'food1_food2',
      foodLowId: 'food1',
      foodHighId: 'food2',
      presentedLeftId: 'food1',
      presentedRightId: 'food2',
      result: 'tie' as const,
      winnerFoodId: 'food1', // Should not be provided for tie
    }

    const result = VoteRequestSchema.safeParse(invalidVote)
    expect(result.success).toBe(false)
  })

  it('should not allow same food IDs', () => {
    const invalidVote = {
      pairKey: 'food1_food1',
      foodLowId: 'food1',
      foodHighId: 'food1', // Same as foodLowId
      presentedLeftId: 'food1',
      presentedRightId: 'food1',
      result: 'skip' as const,
    }

    const result = VoteRequestSchema.safeParse(invalidVote)
    expect(result.success).toBe(false)
  })

  it('should validate that presented IDs match normalized IDs', () => {
    const validVote = {
      pairKey: 'food1_food2',
      foodLowId: 'food1',
      foodHighId: 'food2',
      presentedLeftId: 'food2', // Swapped presentation order
      presentedRightId: 'food1',
      result: 'skip' as const,
    }

    const result = VoteRequestSchema.safeParse(validVote)
    expect(result.success).toBe(true)
  })

  it('should reject invalid pair key format', () => {
    const invalidVote = {
      pairKey: 'invalid-pair-key', // Missing underscore separator
      foodLowId: 'food1',
      foodHighId: 'food2',
      presentedLeftId: 'food1',
      presentedRightId: 'food2',
      result: 'skip' as const,
    }

    const result = VoteRequestSchema.safeParse(invalidVote)
    expect(result.success).toBe(false)
  })

  it('should validate that winnerFoodId is one of the compared foods', () => {
    const invalidVote = {
      pairKey: 'food1_food2',
      foodLowId: 'food1',
      foodHighId: 'food2',
      presentedLeftId: 'food1',
      presentedRightId: 'food2',
      result: 'win' as const,
      winnerFoodId: 'food3', // Not one of the compared foods
    }

    const result = VoteRequestSchema.safeParse(invalidVote)
    expect(result.success).toBe(false)
  })
})

describe('CommentRequestSchema', () => {
  it('should validate a valid comment request', () => {
    const validComment = {
      pairKey: 'food1_food2',
      result: 'win' as const,
      winnerFoodId: 'food1',
      content: 'This is a great food!',
    }

    const result = CommentRequestSchema.safeParse(validComment)
    expect(result.success).toBe(true)
  })

  it('should require winnerFoodId for win results', () => {
    const invalidComment = {
      pairKey: 'food1_food2',
      result: 'win' as const,
      content: 'This is a great food!',
      // Missing winnerFoodId
    }

    const result = CommentRequestSchema.safeParse(invalidComment)
    expect(result.success).toBe(false)
  })

  it('should not allow winnerFoodId for tie results', () => {
    const invalidComment = {
      pairKey: 'food1_food2',
      result: 'tie' as const,
      winnerFoodId: 'food1', // Should not be provided for tie
      content: 'Both are equally good!',
    }

    const result = CommentRequestSchema.safeParse(invalidComment)
    expect(result.success).toBe(false)
  })

  it('should enforce content length limits', () => {
    const longContent = 'a'.repeat(281) // Exceeds 280 character limit
    const invalidComment = {
      pairKey: 'food1_food2',
      result: 'tie' as const,
      content: longContent,
    }

    const result = CommentRequestSchema.safeParse(invalidComment)
    expect(result.success).toBe(false)
  })

  it('should not allow empty content', () => {
    const invalidComment = {
      pairKey: 'food1_food2',
      result: 'tie' as const,
      content: '',
    }

    const result = CommentRequestSchema.safeParse(invalidComment)
    expect(result.success).toBe(false)
  })

  it('should not allow whitespace-only content', () => {
    const invalidComment = {
      pairKey: 'food1_food2',
      result: 'tie' as const,
      content: '   \n\t   ',
    }

    const result = CommentRequestSchema.safeParse(invalidComment)
    expect(result.success).toBe(false)
  })
})

describe('UpdateNationalitySchema', () => {
  it('should validate valid country codes', () => {
    const validUpdate = { nationality: 'US' }
    const result = UpdateNationalitySchema.safeParse(validUpdate)
    expect(result.success).toBe(true)
  })

  it('should allow unknown nationality', () => {
    const validUpdate = { nationality: 'unknown' }
    const result = UpdateNationalitySchema.safeParse(validUpdate)
    expect(result.success).toBe(true)
  })

  it('should allow undefined nationality', () => {
    const validUpdate = {}
    const result = UpdateNationalitySchema.safeParse(validUpdate)
    expect(result.success).toBe(true)
  })

  it('should reject invalid country codes', () => {
    const invalidUpdate = { nationality: 'INVALID' }
    const result = UpdateNationalitySchema.safeParse(invalidUpdate)
    expect(result.success).toBe(false)
  })
})

describe('PaginationQuerySchema', () => {
  it('should validate valid pagination parameters', () => {
    const validQuery = { limit: '10', cursor: 'some-cursor' }
    const result = PaginationQuerySchema.safeParse(validQuery)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(10)
      expect(result.data.cursor).toBe('some-cursor')
    }
  })

  it('should use default limit when not provided', () => {
    const validQuery = {}
    const result = PaginationQuerySchema.safeParse(validQuery)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(20)
    }
  })

  it('should reject limits outside valid range', () => {
    const invalidQuery = { limit: '101' } // Exceeds max of 100
    const result = PaginationQuerySchema.safeParse(invalidQuery)
    expect(result.success).toBe(false)
  })

  it('should reject zero or negative limits', () => {
    const invalidQuery = { limit: '0' }
    const result = PaginationQuerySchema.safeParse(invalidQuery)
    expect(result.success).toBe(false)
  })
})

describe('sanitizeContent', () => {
  it('should escape HTML characters', () => {
    const input = '<script>alert("xss")</script>'
    const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
    expect(sanitizeContent(input)).toBe(expected)
  })

  it('should escape quotes and apostrophes', () => {
    const input = `He said "Hello" and she said 'Hi'`
    const expected = `He said &quot;Hello&quot; and she said &#x27;Hi&#x27;`
    expect(sanitizeContent(input)).toBe(expected)
  })

  it('should trim whitespace', () => {
    const input = '  Hello World  '
    const expected = 'Hello World'
    expect(sanitizeContent(input)).toBe(expected)
  })

  it('should handle empty strings', () => {
    expect(sanitizeContent('')).toBe('')
  })

  it('should handle normal text without changes', () => {
    const input = 'This is normal text with numbers 123 and symbols !@#$%^*()'
    expect(sanitizeContent(input)).toBe(input)
  })
})

describe('formatValidationError', () => {
  it('should format Zod validation errors correctly', () => {
    const schema = z.object({
      name: z.string().min(1),
      age: z.number().min(0),
    })

    const result = schema.safeParse({ name: '', age: -1 })
    expect(result.success).toBe(false)

    if (!result.success) {
      const formatted = formatValidationError(result.error)
      expect(formatted.error).toBe('Validation Error')
      expect(formatted.message).toBe('Invalid request data')
      expect(formatted.code).toBe(400)
      expect(formatted.details).toHaveLength(2)
      expect(formatted.details[0]).toHaveProperty('path')
      expect(formatted.details[0]).toHaveProperty('message')
      expect(formatted.details[0]).toHaveProperty('code')
    }
  })
})
