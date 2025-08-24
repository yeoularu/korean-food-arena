import { describe, it, expect, beforeEach } from 'vitest'
import { DatabaseSeeder } from '../seedDatabase'
import { KOREAN_FOODS } from '../seedData'
import type { DrizzleD1Database } from 'drizzle-orm/d1'

describe('DatabaseSeeder', () => {
  let seeder: DatabaseSeeder

  beforeEach(() => {
    // Create a mock database that satisfies the interface
    const mockDb = {
      select: () => ({
        from: () => ({
          orderBy: () => Promise.resolve([]),
        }),
      }),
      insert: () => ({
        values: () => ({
          returning: () => Promise.resolve([]),
        }),
      }),
    } as unknown as DrizzleD1Database

    seeder = new DatabaseSeeder(mockDb)
  })

  describe('seedFoods', () => {
    it('should have correct seed data structure', () => {
      expect(KOREAN_FOODS).toBeDefined()
      expect(KOREAN_FOODS.length).toBeGreaterThan(0)

      // Check first food item structure
      const firstFood = KOREAN_FOODS[0]
      expect(firstFood).toHaveProperty('name')
      expect(firstFood).toHaveProperty('imageUrl')
      expect(typeof firstFood.name).toBe('string')
      expect(typeof firstFood.imageUrl).toBe('string')
      expect(firstFood.name.length).toBeGreaterThan(0)
      expect(firstFood.imageUrl).toMatch(/^\/img\/food\/display\/.*\.webp$/)
    })

    it('should contain expected Korean foods', () => {
      const foodNames = KOREAN_FOODS.map((f) => f.name)

      // Check for some key Korean foods
      expect(foodNames).toContain('Bibimbap')
      expect(foodNames).toContain('Bulgogi')
      expect(foodNames).toContain('Kimchi')
      expect(foodNames).toContain('Korean Fried Chicken')
      expect(foodNames).toContain('Japchae')
    })

    it('should have unique food names', () => {
      const foodNames = KOREAN_FOODS.map((f) => f.name)
      const uniqueNames = new Set(foodNames)

      expect(uniqueNames.size).toBe(foodNames.length)
    })

    it('should have valid image URLs', () => {
      KOREAN_FOODS.forEach((food) => {
        expect(food.imageUrl).toMatch(/^\/img\/food\/display\/.*\.webp$/)
      })
    })
  })

  describe('getSeedingStatus', () => {
    it('should return correct seed data count', async () => {
      const status = await seeder.getSeedingStatus()

      expect(status.seedDataCount).toBe(KOREAN_FOODS.length)
      expect(status.totalFoods).toBe(0)
      expect(status.missingFoods).toHaveLength(KOREAN_FOODS.length)
      expect(status.existingFoods).toHaveLength(0)
    })
  })
})
