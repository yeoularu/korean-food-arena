import { describe, it, expect } from 'vitest'
import { food, vote, comment } from '../../../worker/db/schema'

describe('Database Schema', () => {
  it('should have correct food table structure', () => {
    expect(food.id).toBeDefined()
    expect(food.name).toBeDefined()
    expect(food.imageUrl).toBeDefined()
    expect(food.eloScore).toBeDefined()
    expect(food.totalVotes).toBeDefined()
    expect(food.createdAt).toBeDefined()
    expect(food.updatedAt).toBeDefined()
  })

  it('should have correct vote table structure', () => {
    expect(vote.id).toBeDefined()
    expect(vote.pairKey).toBeDefined()
    expect(vote.foodLowId).toBeDefined()
    expect(vote.foodHighId).toBeDefined()
    expect(vote.presentedLeftId).toBeDefined()
    expect(vote.presentedRightId).toBeDefined()
    expect(vote.result).toBeDefined()
    expect(vote.winnerFoodId).toBeDefined()
    expect(vote.userId).toBeDefined()
    expect(vote.createdAt).toBeDefined()
  })

  it('should have correct comment table structure', () => {
    expect(comment.id).toBeDefined()
    expect(comment.pairKey).toBeDefined()
    expect(comment.result).toBeDefined()
    expect(comment.winnerFoodId).toBeDefined()
    expect(comment.content).toBeDefined()
    expect(comment.userId).toBeDefined()
    expect(comment.createdAt).toBeDefined()
  })
})
