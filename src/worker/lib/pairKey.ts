/**
 * Creates a normalized pair key from two food IDs
 * Uses lexicographic ordering to ensure consistent representation
 * regardless of input order (A,B) vs (B,A)
 */
export function createPairKey(foodId1: string, foodId2: string): string {
  const [min, max] = [foodId1, foodId2].sort()
  return `${min}_${max}`
}

/**
 * Helper function to normalize food IDs for consistent pair representation
 * Returns foodLowId (min) and foodHighId (max) in lexicographic order
 */
export function normalizeFoodIds(
  foodId1: string,
  foodId2: string,
): {
  foodLowId: string
  foodHighId: string
} {
  const [min, max] = [foodId1, foodId2].sort()
  return { foodLowId: min, foodHighId: max }
}

/**
 * Extracts the two food IDs from a normalized pair key
 */
export function parsePairKey(pairKey: string): {
  foodLowId: string
  foodHighId: string
} {
  const [foodLowId, foodHighId] = pairKey.split('_')
  if (!foodLowId || !foodHighId) {
    throw new Error(`Invalid pair key format: ${pairKey}`)
  }
  return { foodLowId, foodHighId }
}
