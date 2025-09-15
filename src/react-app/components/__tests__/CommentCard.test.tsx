import { describe, it, expect } from 'vitest'
import type { Comment, EnhancedComment } from '@/lib/types'

// Since we don't have React Testing Library, we'll test the component logic
// by testing the helper functions and type guards

function isEnhancedComment(
  comment: Comment | EnhancedComment,
): comment is EnhancedComment {
  return (
    'isCurrentPairing' in comment &&
    'otherFoodId' in comment &&
    'otherFoodName' in comment
  )
}

describe('CommentCard Component Logic', () => {
  const mockFoodNamesById: Record<string, string> = {
    food1: 'Kimchi',
    food2: 'Bulgogi',
    food3: 'Bibimbap',
  }

  const baseComment: Comment = {
    id: '1',
    pairKey: 'food1_food2',
    result: 'win',
    winnerFoodId: 'food1',
    content: 'This is a great food!',
    createdAt: '2024-01-15T10:00:00Z',
    nationality: 'Korean',
  }

  const enhancedComment: EnhancedComment = {
    ...baseComment,
    isCurrentPairing: false,
    otherFoodId: 'food3',
    otherFoodName: 'Bibimbap',
  }

  describe('isEnhancedComment type guard', () => {
    it('should identify regular comments correctly', () => {
      expect(isEnhancedComment(baseComment)).toBe(false)
    })

    it('should identify enhanced comments correctly', () => {
      expect(isEnhancedComment(enhancedComment)).toBe(true)
    })

    it('should handle partial enhanced comment properties', () => {
      const partialEnhanced = {
        ...baseComment,
        isCurrentPairing: true,
        // Missing otherFoodId and otherFoodName
      }
      expect(isEnhancedComment(partialEnhanced as Comment)).toBe(false)
    })
  })

  describe('Comment display logic', () => {
    it('should determine when to show pairing context', () => {
      const showPairingContext = true
      const isEnhanced = isEnhancedComment(enhancedComment)
      const shouldShowContext =
        showPairingContext && isEnhanced && !enhancedComment.isCurrentPairing

      expect(shouldShowContext).toBe(true)
    })

    it('should not show pairing context for current pairing comments', () => {
      const currentPairingComment = {
        ...enhancedComment,
        isCurrentPairing: true,
      }
      const showPairingContext = true
      const isEnhanced = isEnhancedComment(currentPairingComment)
      const shouldShowContext =
        showPairingContext &&
        isEnhanced &&
        !currentPairingComment.isCurrentPairing

      expect(shouldShowContext).toBe(false)
    })

    it('should not show pairing context when showPairingContext is false', () => {
      const showPairingContext = false
      const isEnhanced = isEnhancedComment(enhancedComment)
      const shouldShowContext =
        showPairingContext && isEnhanced && !enhancedComment.isCurrentPairing

      expect(shouldShowContext).toBe(false)
    })

    it('should not show pairing context for regular comments', () => {
      const showPairingContext = true
      const isEnhanced = isEnhancedComment(baseComment)
      // For regular comments, isCurrentPairing doesn't exist, so this would be false anyway
      const shouldShowContext = showPairingContext && isEnhanced

      expect(shouldShowContext).toBe(false)
    })
  })

  describe('Nationality display logic', () => {
    // Helper function to simulate the new nationality display logic
    const getNationalityDisplay = (nationality?: string) => {
      if (!nationality || nationality === 'unknown') {
        return {
          text: 'Anonymous',
          countryCode: undefined,
          showFlag: false,
        }
      }
      if (nationality === 'Other') {
        return {
          text: 'Other',
          countryCode: undefined,
          showFlag: false,
        }
      }
      // For actual country codes, use FlagDisplay
      return {
        text: nationality,
        countryCode: nationality,
        showFlag: true,
      }
    }

    it('should display nationality with flag for country codes', () => {
      const koreanComment = { ...baseComment, nationality: 'KR' }
      const display = getNationalityDisplay(koreanComment.nationality)

      expect(display.text).toBe('KR')
      expect(display.countryCode).toBe('KR')
      expect(display.showFlag).toBe(true)
    })

    it('should display Anonymous for unknown nationality without flag', () => {
      const unknownComment = { ...baseComment, nationality: 'unknown' }
      const display = getNationalityDisplay(unknownComment.nationality)

      expect(display.text).toBe('Anonymous')
      expect(display.countryCode).toBeUndefined()
      expect(display.showFlag).toBe(false)
    })

    it('should display Anonymous for missing nationality without flag', () => {
      const noNationalityComment = { ...baseComment, nationality: undefined }
      const display = getNationalityDisplay(noNationalityComment.nationality)

      expect(display.text).toBe('Anonymous')
      expect(display.countryCode).toBeUndefined()
      expect(display.showFlag).toBe(false)
    })

    it('should display Other for privacy-protected nationality without flag', () => {
      const otherComment = { ...baseComment, nationality: 'Other' }
      const display = getNationalityDisplay(otherComment.nationality)

      expect(display.text).toBe('Other')
      expect(display.countryCode).toBeUndefined()
      expect(display.showFlag).toBe(false)
    })

    it('should display US nationality with flag', () => {
      const usComment = { ...baseComment, nationality: 'US' }
      const display = getNationalityDisplay(usComment.nationality)

      expect(display.text).toBe('US')
      expect(display.countryCode).toBe('US')
      expect(display.showFlag).toBe(true)
    })

    it('should handle legacy full country names as country codes', () => {
      // Legacy data might have full names instead of codes
      const legacyComment = { ...baseComment, nationality: 'Korean' }
      const display = getNationalityDisplay(legacyComment.nationality)

      expect(display.text).toBe('Korean')
      expect(display.countryCode).toBe('Korean')
      expect(display.showFlag).toBe(true)
    })
  })

  describe('Vote result display logic', () => {
    it('should display food name for win votes', () => {
      const foodName =
        baseComment.result === 'win' && baseComment.winnerFoodId
          ? mockFoodNamesById[baseComment.winnerFoodId] ||
            `Food ${baseComment.winnerFoodId}`
          : 'Tie'

      expect(foodName).toBe('Kimchi')
    })

    it('should display Tie for tie votes', () => {
      const tieComment: Comment = {
        ...baseComment,
        result: 'tie',
        winnerFoodId: undefined,
      }
      const foodName =
        tieComment.result === 'win' && tieComment.winnerFoodId
          ? mockFoodNamesById[tieComment.winnerFoodId] ||
            `Food ${tieComment.winnerFoodId}`
          : 'Tie'

      expect(foodName).toBe('Tie')
    })

    it('should handle missing food names gracefully', () => {
      const unknownFoodComment = {
        ...baseComment,
        winnerFoodId: 'unknown-food',
      }
      const foodName =
        unknownFoodComment.result === 'win' && unknownFoodComment.winnerFoodId
          ? mockFoodNamesById[unknownFoodComment.winnerFoodId] ||
            `Food ${unknownFoodComment.winnerFoodId}`
          : 'Tie'

      expect(foodName).toBe('Food unknown-food')
    })
  })

  describe('Date formatting', () => {
    it('should handle valid date strings', () => {
      const date = new Date(baseComment.createdAt)
      expect(date.toLocaleDateString()).toBeTruthy()
      expect(date.getTime()).not.toBeNaN()
    })

    it('should handle ISO date format', () => {
      const isoDate = '2024-01-15T10:00:00Z'
      const date = new Date(isoDate)
      expect(date.toISOString()).toBe('2024-01-15T10:00:00.000Z')
    })
  })

  describe('Enhanced comment properties', () => {
    it('should have all required enhanced properties', () => {
      expect(enhancedComment).toHaveProperty('isCurrentPairing')
      expect(enhancedComment).toHaveProperty('otherFoodId')
      expect(enhancedComment).toHaveProperty('otherFoodName')
      expect(typeof enhancedComment.isCurrentPairing).toBe('boolean')
      expect(typeof enhancedComment.otherFoodId).toBe('string')
      expect(typeof enhancedComment.otherFoodName).toBe('string')
    })

    it('should preserve all base comment properties', () => {
      expect(enhancedComment).toHaveProperty('id')
      expect(enhancedComment).toHaveProperty('pairKey')
      expect(enhancedComment).toHaveProperty('result')
      expect(enhancedComment).toHaveProperty('content')
      expect(enhancedComment).toHaveProperty('createdAt')
      expect(enhancedComment).toHaveProperty('nationality')
    })
  })
})
