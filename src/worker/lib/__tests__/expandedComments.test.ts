import { describe, it, expect } from 'vitest'
import {
  extractOtherFoodId,
  applyNationalityPrivacy,
} from '../expandedComments'
import { ValidationError } from '../errorHandling'

describe('extractOtherFoodId', () => {
  it('should extract the other food ID when given the first food ID', () => {
    const result = extractOtherFoodId('food1_food2', 'food1')
    expect(result).toBe('food2')
  })

  it('should extract the other food ID when given the second food ID', () => {
    const result = extractOtherFoodId('food1_food2', 'food2')
    expect(result).toBe('food1')
  })

  it('should handle UUID-style food IDs', () => {
    const pairKey =
      '123e4567-e89b-12d3-a456-426614174000_987fcdeb-51a2-43d1-9f12-123456789abc'
    const foodId1 = '123e4567-e89b-12d3-a456-426614174000'
    const foodId2 = '987fcdeb-51a2-43d1-9f12-123456789abc'

    expect(extractOtherFoodId(pairKey, foodId1)).toBe(foodId2)
    expect(extractOtherFoodId(pairKey, foodId2)).toBe(foodId1)
  })

  it('should throw ValidationError for invalid pair key format', () => {
    expect(() => extractOtherFoodId('invalid-pair-key', 'food1')).toThrow(
      ValidationError,
    )
    expect(() => extractOtherFoodId('food1', 'food1')).toThrow(ValidationError)
    expect(() => extractOtherFoodId('', 'food1')).toThrow(ValidationError)
  })

  it('should throw ValidationError when food ID is not part of the pair', () => {
    expect(() => extractOtherFoodId('food1_food2', 'food3')).toThrow(
      ValidationError,
    )
    expect(() => extractOtherFoodId('food1_food2', 'food1_food2')).toThrow(
      ValidationError,
    )
  })

  it('should handle pair keys with special characters in food IDs', () => {
    const result = extractOtherFoodId(
      'korean-bbq_kimchi-fried-rice',
      'korean-bbq',
    )
    expect(result).toBe('kimchi-fried-rice')
  })
})

describe('input validation', () => {
  it('should validate pair key format', () => {
    // Valid formats (food IDs without underscores)
    expect(() => extractOtherFoodId('abc_def', 'abc')).not.toThrow()
    expect(() => extractOtherFoodId('123_456', '123')).not.toThrow()
    expect(() => extractOtherFoodId('food-1_food-2', 'food-1')).not.toThrow()

    // Invalid formats (no underscore or empty parts)
    expect(() => extractOtherFoodId('abc', 'abc')).toThrow(ValidationError)
    expect(() => extractOtherFoodId('_def', 'def')).toThrow(ValidationError)
    expect(() => extractOtherFoodId('abc_', 'abc')).toThrow(ValidationError)

    // Note: Current implementation has limitations with food IDs containing underscores
    // 'abc_def_ghi' gets parsed as foodLowId='abc', foodHighId='def' (not 'def_ghi')
    expect(() => extractOtherFoodId('abc_def_ghi', 'abc')).not.toThrow()
    expect(extractOtherFoodId('abc_def_ghi', 'abc')).toBe('def') // Only gets first part after split
  })

  it('should handle empty and null values', () => {
    expect(() => extractOtherFoodId('', 'food1')).toThrow(ValidationError)
    expect(() => extractOtherFoodId('food1_food2', '')).toThrow(ValidationError)
  })

  it('should be case sensitive', () => {
    expect(extractOtherFoodId('Food1_food2', 'Food1')).toBe('food2')
    expect(() => extractOtherFoodId('Food1_food2', 'food1')).toThrow(
      ValidationError,
    )
  })
})

describe('pair key parsing edge cases', () => {
  it('should handle very long food IDs', () => {
    const longId1 = 'a'.repeat(100)
    const longId2 = 'b'.repeat(100)
    const pairKey = `${longId1}_${longId2}`

    expect(extractOtherFoodId(pairKey, longId1)).toBe(longId2)
    expect(extractOtherFoodId(pairKey, longId2)).toBe(longId1)
  })

  it('should handle food IDs with underscores in them', () => {
    // Note: Current implementation has a limitation with underscores in food IDs
    // split('_') splits on ALL underscores, so 'korean_bbq_fried_rice' becomes ['korean', 'bbq', 'fried', 'rice']
    // parsePairKey only takes first two: foodLowId='korean', foodHighId='bbq'
    const pairKey = 'korean_bbq_fried_rice'

    // This will parse as foodLowId='korean', foodHighId='bbq' (not the full second food ID)
    expect(extractOtherFoodId(pairKey, 'korean')).toBe('bbq')
    expect(extractOtherFoodId(pairKey, 'bbq')).toBe('korean')

    // These would fail because the parsing doesn't work as expected with underscores
    expect(() => extractOtherFoodId(pairKey, 'korean_bbq')).toThrow(
      ValidationError,
    )
    expect(() => extractOtherFoodId(pairKey, 'fried_rice')).toThrow(
      ValidationError,
    )
  })

  it('should handle identical food IDs in pair key', () => {
    // This shouldn't happen in practice, but let's handle it gracefully
    const pairKey = 'food1_food1'
    expect(extractOtherFoodId(pairKey, 'food1')).toBe('food1')
  })
})

describe('applyNationalityPrivacy', () => {
  // Helper function to create mock comments with nationalities
  const createMockComment = (
    nationality: string | null | undefined,
    id: string = 'test-id',
  ) => ({
    id,
    pairKey: 'food1_food2',
    result: 'win' as const,
    winnerFoodId: 'food1',
    content: 'Test comment',
    createdAt: '2024-01-01T00:00:00Z',
    nationality,
  })

  it('should protect nationalities with fewer than 5 occurrences', () => {
    const comments = [
      createMockComment('Korean', '1'),
      createMockComment('Korean', '2'),
      createMockComment('Korean', '3'),
      createMockComment('Korean', '4'),
      createMockComment('Korean', '5'), // 5 Korean comments - should be visible
      createMockComment('Japanese', '6'),
      createMockComment('Japanese', '7'), // 2 Japanese comments - should be "Other"
      createMockComment('Chinese', '8'), // 1 Chinese comment - should be "Other"
      createMockComment(null, '9'), // null nationality - should be "Other" (only 1 unknown)
    ]

    const protectedComments = applyNationalityPrivacy(comments)

    // Korean should be visible (5 occurrences)
    const koreanComments = protectedComments.filter(
      (c) => c.nationality === 'Korean',
    )
    expect(koreanComments).toHaveLength(5)

    // Japanese and Chinese should be "Other" (< 5 occurrences)
    const otherComments = protectedComments.filter(
      (c) => c.nationality === 'Other',
    )
    expect(otherComments).toHaveLength(4) // 2 Japanese + 1 Chinese + 1 unknown
  })

  it('should handle mixed comment types consistently', () => {
    // Simulate current pairing comments and expanded comments
    const currentPairingComments = [
      createMockComment('Korean', '1'),
      createMockComment('Korean', '2'),
      createMockComment('Japanese', '3'),
    ]

    const expandedComments = [
      createMockComment('Korean', '4'),
      createMockComment('Korean', '5'),
      createMockComment('Korean', '6'), // Total 5 Korean across both types
      createMockComment('Japanese', '7'), // Total 2 Japanese across both types
    ]

    const allComments = currentPairingComments.concat(expandedComments)
    const protectedComments = applyNationalityPrivacy(allComments)

    // Korean should be visible in both current and expanded (5 total occurrences)
    const koreanComments = protectedComments.filter(
      (c) => c.nationality === 'Korean',
    )
    expect(koreanComments).toHaveLength(5)

    // Japanese should be "Other" in both current and expanded (only 2 total occurrences)
    const japaneseComments = protectedComments.filter(
      (c) => c.nationality === 'Japanese',
    )
    expect(japaneseComments).toHaveLength(0)

    const otherComments = protectedComments.filter(
      (c) => c.nationality === 'Other',
    )
    expect(otherComments).toHaveLength(2) // 2 Japanese comments
  })

  it('should handle edge case with exactly 5 occurrences', () => {
    const comments = Array.from({ length: 5 }, (_, i) =>
      createMockComment('Korean', `korean-${i}`),
    )

    const protectedComments = applyNationalityPrivacy(comments)

    // Exactly 5 occurrences should be visible
    const koreanComments = protectedComments.filter(
      (c) => c.nationality === 'Korean',
    )
    expect(koreanComments).toHaveLength(5)
  })

  it('should handle edge case with 4 occurrences', () => {
    const comments = Array.from({ length: 4 }, (_, i) =>
      createMockComment('Korean', `korean-${i}`),
    )

    const protectedComments = applyNationalityPrivacy(comments)

    // 4 occurrences should be protected as "Other"
    const koreanComments = protectedComments.filter(
      (c) => c.nationality === 'Korean',
    )
    expect(koreanComments).toHaveLength(0)

    const otherComments = protectedComments.filter(
      (c) => c.nationality === 'Other',
    )
    expect(otherComments).toHaveLength(4)
  })

  it('should handle null and undefined nationalities', () => {
    const comments = [
      createMockComment(null, '1'),
      createMockComment(undefined, '2'),
      createMockComment('', '3'),
      createMockComment('Korean', '4'),
      createMockComment('Korean', '5'),
    ]

    const protectedComments = applyNationalityPrivacy(comments)

    // null, undefined, and empty string should all be treated as "unknown"
    // Since there are 3 "unknown" and 2 "Korean", both should be "Other"
    const otherComments = protectedComments.filter(
      (c) => c.nationality === 'Other',
    )
    expect(otherComments).toHaveLength(5)
  })

  it('should handle empty comment array', () => {
    const comments: Array<{ nationality?: string | null }> = []
    const protectedComments = applyNationalityPrivacy(comments)
    expect(protectedComments).toHaveLength(0)
  })

  it('should handle large datasets with multiple nationalities', () => {
    const nationalities = [
      'Korean',
      'Japanese',
      'Chinese',
      'American',
      'British',
      'German',
      'French',
    ]
    const comments: Array<{ nationality?: string | null }> = []

    // Create different numbers of comments for each nationality
    nationalities.forEach((nationality, index) => {
      const count = index + 3 // 3, 4, 5, 6, 7, 8, 9 comments respectively
      for (let i = 0; i < count; i++) {
        comments.push(createMockComment(nationality, `${nationality}-${i}`))
      }
    })

    const protectedComments = applyNationalityPrivacy(comments)

    // Korean (3) and Japanese (4) should be "Other"
    const koreanComments = protectedComments.filter(
      (c) => c.nationality === 'Korean',
    )
    expect(koreanComments).toHaveLength(0)

    const japaneseComments = protectedComments.filter(
      (c) => c.nationality === 'Japanese',
    )
    expect(japaneseComments).toHaveLength(0)

    // Chinese (5), American (6), British (7), German (8), French (9) should be visible
    const chineseComments = protectedComments.filter(
      (c) => c.nationality === 'Chinese',
    )
    expect(chineseComments).toHaveLength(5)

    const americanComments = protectedComments.filter(
      (c) => c.nationality === 'American',
    )
    expect(americanComments).toHaveLength(6)

    // Total "Other" should be Korean (3) + Japanese (4) = 7
    const otherComments = protectedComments.filter(
      (c) => c.nationality === 'Other',
    )
    expect(otherComments).toHaveLength(7)
  })

  it('should maintain consistent protection across different comment distributions', () => {
    // Test scenario: Current pairing has mostly Korean comments, expanded has diverse nationalities
    const currentPairingComments = [
      createMockComment('Korean', '1'),
      createMockComment('Korean', '2'),
      createMockComment('Korean', '3'),
    ]

    const expandedComments = [
      createMockComment('Korean', '4'),
      createMockComment('Korean', '5'), // Total 5 Korean - should be visible
      createMockComment('Japanese', '6'),
      createMockComment('Chinese', '7'),
      createMockComment('American', '8'),
      createMockComment('British', '9'), // All others have 1 each - should be "Other"
    ]

    const allComments = currentPairingComments.concat(expandedComments)
    const protectedComments = applyNationalityPrivacy(allComments)

    // Korean should be visible in both current and expanded sections
    const koreanComments = protectedComments.filter(
      (c) => c.nationality === 'Korean',
    )
    expect(koreanComments).toHaveLength(5)

    // All other nationalities should be "Other"
    const otherComments = protectedComments.filter(
      (c) => c.nationality === 'Other',
    )
    expect(otherComments).toHaveLength(4) // Japanese, Chinese, American, British
  })

  it('should use custom minimum group size', () => {
    const comments = [
      createMockComment('Korean', '1'),
      createMockComment('Korean', '2'),
      createMockComment('Korean', '3'), // 3 Korean comments
      createMockComment('Japanese', '4'),
      createMockComment('Japanese', '5'), // 2 Japanese comments
    ]

    // Test with minGroupSize of 3
    const protectedComments = applyNationalityPrivacy(comments, 3)

    // Korean should be visible (3 occurrences >= 3)
    const koreanComments = protectedComments.filter(
      (c) => c.nationality === 'Korean',
    )
    expect(koreanComments).toHaveLength(3)

    // Japanese should be "Other" (2 occurrences < 3)
    const otherComments = protectedComments.filter(
      (c) => c.nationality === 'Other',
    )
    expect(otherComments).toHaveLength(2)
  })

  it('should preserve original comment structure', () => {
    const comments = [
      {
        id: 'test-1',
        content: 'Great food!',
        nationality: 'Korean',
        otherField: 'should be preserved',
      },
      {
        id: 'test-2',
        content: 'Not bad',
        nationality: 'Korean',
        anotherField: 42,
      },
    ]

    const protectedComments = applyNationalityPrivacy(comments)

    expect(protectedComments).toHaveLength(2)
    expect(protectedComments[0]).toEqual({
      id: 'test-1',
      content: 'Great food!',
      nationality: 'Other', // < 5 occurrences
      otherField: 'should be preserved',
    })
    expect(protectedComments[1]).toEqual({
      id: 'test-2',
      content: 'Not bad',
      nationality: 'Other', // < 5 occurrences
      anotherField: 42,
    })
  })
})

// Note: Full integration tests for getExpandedComments would require complex database mocking
// The main function is tested through the API endpoint integration tests
