import { describe, it, expect } from 'vitest'
import { ELOCalculator, type MatchResult } from '../elo'

describe('ELOCalculator', () => {
  describe('calculateExpectedScore', () => {
    it('should return 0.5 for equal ratings', () => {
      const expected = ELOCalculator.calculateExpectedScore(1200, 1200)
      expect(expected).toBeCloseTo(0.5, 5)
    })

    it('should return higher probability for higher rated player', () => {
      const expected = ELOCalculator.calculateExpectedScore(1400, 1200)
      expect(expected).toBeGreaterThan(0.5)
      expect(expected).toBeCloseTo(0.76, 2)
    })

    it('should return lower probability for lower rated player', () => {
      const expected = ELOCalculator.calculateExpectedScore(1200, 1400)
      expect(expected).toBeLessThan(0.5)
      expect(expected).toBeCloseTo(0.24, 2)
    })

    it('should handle extreme rating differences', () => {
      const expected1 = ELOCalculator.calculateExpectedScore(2000, 1000)
      const expected2 = ELOCalculator.calculateExpectedScore(1000, 2000)

      expect(expected1).toBeCloseTo(0.997, 3)
      expect(expected2).toBeCloseTo(0.003, 3)
    })
  })

  describe('calculateNewRatings', () => {
    it('should handle win scenario correctly', () => {
      const result = ELOCalculator.calculateNewRatings(1200, 1200, 'win')

      expect(result.newRating1).toBe(1216) // 1200 + 32 * (1 - 0.5)
      expect(result.newRating2).toBe(1184) // 1200 + 32 * (0 - 0.5)
    })

    it('should handle loss scenario correctly', () => {
      const result = ELOCalculator.calculateNewRatings(1200, 1200, 'loss')

      expect(result.newRating1).toBe(1184) // 1200 + 32 * (0 - 0.5)
      expect(result.newRating2).toBe(1216) // 1200 + 32 * (1 - 0.5)
    })

    it('should handle tie scenario correctly', () => {
      const result = ELOCalculator.calculateNewRatings(1200, 1200, 'tie')

      expect(result.newRating1).toBe(1200) // 1200 + 32 * (0.5 - 0.5)
      expect(result.newRating2).toBe(1200) // 1200 + 32 * (0.5 - 0.5)
    })

    it('should give smaller rating changes when higher rated player wins', () => {
      const result = ELOCalculator.calculateNewRatings(1400, 1200, 'win')

      // Higher rated player should gain fewer points
      expect(result.newRating1 - 1400).toBeLessThan(16)
      // Lower rated player should lose fewer points
      expect(1200 - result.newRating2).toBeLessThan(16)
    })

    it('should give larger rating changes when lower rated player wins (upset)', () => {
      const result = ELOCalculator.calculateNewRatings(1200, 1400, 'win')

      // Lower rated player should gain more points for upset
      expect(result.newRating1 - 1200).toBeGreaterThan(16)
      // Higher rated player should lose more points for upset
      expect(1400 - result.newRating2).toBeGreaterThan(16)
    })

    it('should round ratings to integers', () => {
      const result = ELOCalculator.calculateNewRatings(1201, 1199, 'win')

      expect(Number.isInteger(result.newRating1)).toBe(true)
      expect(Number.isInteger(result.newRating2)).toBe(true)
    })

    it('should throw error for invalid result', () => {
      expect(() => {
        ELOCalculator.calculateNewRatings(1200, 1200, 'invalid' as MatchResult)
      }).toThrow('Invalid match result: invalid')
    })

    it('should maintain rating conservation (sum should be approximately equal)', () => {
      const initialSum = 1200 + 1300
      const result = ELOCalculator.calculateNewRatings(1200, 1300, 'tie')
      const finalSum = result.newRating1 + result.newRating2

      // For ties, total ratings should be exactly conserved
      expect(finalSum).toBe(initialSum)
    })

    it('should handle edge case with very low ratings', () => {
      const result = ELOCalculator.calculateNewRatings(100, 200, 'win')

      expect(result.newRating1).toBeGreaterThan(100)
      expect(result.newRating2).toBeLessThan(200)
      expect(Number.isInteger(result.newRating1)).toBe(true)
      expect(Number.isInteger(result.newRating2)).toBe(true)
    })

    it('should handle edge case with very high ratings', () => {
      const result = ELOCalculator.calculateNewRatings(2800, 2900, 'win')

      expect(result.newRating1).toBeGreaterThan(2800)
      expect(result.newRating2).toBeLessThan(2900)
      expect(Number.isInteger(result.newRating1)).toBe(true)
      expect(Number.isInteger(result.newRating2)).toBe(true)
    })
  })

  describe('calculateRatingChange', () => {
    it('should return positive change for win', () => {
      const change = ELOCalculator.calculateRatingChange(1200, 1200, 'win')
      expect(change).toBe(16) // 32 * (1 - 0.5)
    })

    it('should return negative change for loss', () => {
      const change = ELOCalculator.calculateRatingChange(1200, 1200, 'loss')
      expect(change).toBe(-16) // 32 * (0 - 0.5)
    })

    it('should return zero change for tie with equal ratings', () => {
      const change = ELOCalculator.calculateRatingChange(1200, 1200, 'tie')
      expect(change).toBe(0) // 32 * (0.5 - 0.5)
    })

    it('should return smaller positive change when higher rated player wins', () => {
      const change = ELOCalculator.calculateRatingChange(1400, 1200, 'win')
      expect(change).toBeGreaterThan(0)
      expect(change).toBeLessThan(16)
    })

    it('should return larger positive change when lower rated player wins', () => {
      const change = ELOCalculator.calculateRatingChange(1200, 1400, 'win')
      expect(change).toBeGreaterThan(16)
    })

    it('should throw error for invalid result', () => {
      expect(() => {
        ELOCalculator.calculateRatingChange(
          1200,
          1200,
          'invalid' as MatchResult,
        )
      }).toThrow('Invalid match result: invalid')
    })
  })

  describe('isValidRating', () => {
    it('should return true for valid ratings', () => {
      expect(ELOCalculator.isValidRating(1200)).toBe(true)
      expect(ELOCalculator.isValidRating(0)).toBe(true)
      expect(ELOCalculator.isValidRating(4000)).toBe(true)
      expect(ELOCalculator.isValidRating(1500)).toBe(true)
    })

    it('should return false for invalid ratings', () => {
      expect(ELOCalculator.isValidRating(-1)).toBe(false)
      expect(ELOCalculator.isValidRating(4001)).toBe(false)
      expect(ELOCalculator.isValidRating(1200.5)).toBe(false)
      expect(ELOCalculator.isValidRating(NaN)).toBe(false)
      expect(ELOCalculator.isValidRating(Infinity)).toBe(false)
    })
  })

  describe('ELO algorithm properties', () => {
    it('should have approximately zero-sum rating changes for wins/losses', () => {
      const rating1 = 1300
      const rating2 = 1400

      const winResult = ELOCalculator.calculateNewRatings(
        rating1,
        rating2,
        'win',
      )
      const lossResult = ELOCalculator.calculateNewRatings(
        rating1,
        rating2,
        'loss',
      )

      // Total rating change should be approximately zero (within rounding error)
      const winTotalChange =
        winResult.newRating1 - rating1 + (winResult.newRating2 - rating2)
      const lossTotalChange =
        lossResult.newRating1 - rating1 + (lossResult.newRating2 - rating2)

      expect(Math.abs(winTotalChange)).toBeLessThanOrEqual(1) // Allow for rounding
      expect(Math.abs(lossTotalChange)).toBeLessThanOrEqual(1) // Allow for rounding
    })

    it('should have symmetric expected scores', () => {
      const rating1 = 1300
      const rating2 = 1500

      const expected1vs2 = ELOCalculator.calculateExpectedScore(
        rating1,
        rating2,
      )
      const expected2vs1 = ELOCalculator.calculateExpectedScore(
        rating2,
        rating1,
      )

      expect(expected1vs2 + expected2vs1).toBeCloseTo(1, 5)
    })

    it('should maintain rating conservation for ties', () => {
      const testCases = [
        [1200, 1200],
        [1000, 1500],
        [800, 2000],
        [1234, 1567],
      ]

      testCases.forEach(([rating1, rating2]) => {
        const result = ELOCalculator.calculateNewRatings(
          rating1,
          rating2,
          'tie',
        )
        const initialSum = rating1 + rating2
        const finalSum = result.newRating1 + result.newRating2

        expect(finalSum).toBe(initialSum)
      })
    })

    it('should have consistent K-factor application', () => {
      const rating1 = 1200
      const rating2 = 1300

      const result = ELOCalculator.calculateNewRatings(rating1, rating2, 'win')
      const expected1 = ELOCalculator.calculateExpectedScore(rating1, rating2)

      const expectedChange = Math.round(32 * (1 - expected1))
      const actualChange = result.newRating1 - rating1

      expect(actualChange).toBe(expectedChange)
    })
  })
})
