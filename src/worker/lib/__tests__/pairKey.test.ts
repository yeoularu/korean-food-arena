import { describe, it, expect } from 'vitest'
import { createPairKey, normalizeFoodIds, parsePairKey } from '../pairKey'

describe('PairKey Utilities', () => {
  describe('createPairKey', () => {
    it('should create consistent pair key regardless of input order', () => {
      const key1 = createPairKey('food-a', 'food-b')
      const key2 = createPairKey('food-b', 'food-a')

      expect(key1).toBe(key2)
      expect(key1).toBe('food-a_food-b')
    })

    it('should handle identical food IDs', () => {
      const key = createPairKey('food-a', 'food-a')
      expect(key).toBe('food-a_food-a')
    })

    it('should use lexicographic ordering', () => {
      const key1 = createPairKey('zebra', 'apple')
      const key2 = createPairKey('apple', 'zebra')

      expect(key1).toBe(key2)
      expect(key1).toBe('apple_zebra')
    })
  })

  describe('normalizeFoodIds', () => {
    it('should return normalized food IDs in correct order', () => {
      const result1 = normalizeFoodIds('food-b', 'food-a')
      const result2 = normalizeFoodIds('food-a', 'food-b')

      expect(result1).toEqual({ foodLowId: 'food-a', foodHighId: 'food-b' })
      expect(result2).toEqual({ foodLowId: 'food-a', foodHighId: 'food-b' })
    })

    it('should handle identical food IDs', () => {
      const result = normalizeFoodIds('food-a', 'food-a')
      expect(result).toEqual({ foodLowId: 'food-a', foodHighId: 'food-a' })
    })
  })

  describe('parsePairKey', () => {
    it('should extract food IDs from pair key', () => {
      const result = parsePairKey('food-a_food-b')
      expect(result).toEqual({ foodLowId: 'food-a', foodHighId: 'food-b' })
    })

    it('should throw error for invalid pair key format', () => {
      expect(() => parsePairKey('invalid-key')).toThrow(
        'Invalid pair key format',
      )
      expect(() => parsePairKey('food-a_')).toThrow('Invalid pair key format')
      expect(() => parsePairKey('_food-b')).toThrow('Invalid pair key format')
    })
  })
})
