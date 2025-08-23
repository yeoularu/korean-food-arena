// Utility functions for pair key normalization and food ID handling

export function createPairKey(foodId1: string, foodId2: string): string {
  const [min, max] = [foodId1, foodId2].sort()
  return `${min}_${max}`
}

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

export function determineVoteResult(
  selectedFoodId: string | null,
  foodId1: string,
  foodId2: string,
): {
  result: 'win' | 'tie' | 'skip'
  winnerFoodId?: string
} {
  if (selectedFoodId === null) {
    return { result: 'skip' }
  }

  if (selectedFoodId === 'tie') {
    return { result: 'tie' }
  }

  if (selectedFoodId === foodId1 || selectedFoodId === foodId2) {
    return { result: 'win', winnerFoodId: selectedFoodId }
  }

  throw new Error('Invalid selection')
}
