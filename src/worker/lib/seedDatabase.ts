import type { DrizzleD1Database } from 'drizzle-orm/d1'

import { food } from '../db/schema'
import { KOREAN_FOODS, type SeedFood } from './seedData'

export interface SeedResult {
  success: boolean
  message: string
  inserted: number
  skipped: number
  errors: string[]
}

export class DatabaseSeeder {
  constructor(private db: DrizzleD1Database) {}

  /**
   * Seed the database with Korean food data
   * Skips foods that already exist (by name)
   */
  async seedFoods(): Promise<SeedResult> {
    const result: SeedResult = {
      success: false,
      message: '',
      inserted: 0,
      skipped: 0,
      errors: [],
    }

    try {
      // Get existing food names to avoid duplicates
      const existingFoods = await this.db.select({ name: food.name }).from(food)
      const existingNames = new Set(existingFoods.map((f) => f.name))

      // Filter out foods that already exist
      const foodsToInsert = KOREAN_FOODS.filter(
        (seedFood) => !existingNames.has(seedFood.name),
      )

      result.skipped = KOREAN_FOODS.length - foodsToInsert.length

      if (foodsToInsert.length === 0) {
        result.success = true
        result.message = 'All foods already exist in database'
        return result
      }

      // Prepare food data for insertion
      const foodData = foodsToInsert.map((seedFood: SeedFood) => ({
        name: seedFood.name,
        imageUrl: seedFood.imageUrl,
        eloScore: seedFood.eloScore || 1200,
        totalVotes: seedFood.totalVotes || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))

      // Insert foods in batches to avoid potential issues
      const BATCH_SIZE = 10
      let totalInserted = 0

      for (let i = 0; i < foodData.length; i += BATCH_SIZE) {
        const batch = foodData.slice(i, i + BATCH_SIZE)

        try {
          const insertedFoods = await this.db
            .insert(food)
            .values(batch)
            .returning({ id: food.id, name: food.name })

          totalInserted += insertedFoods.length
        } catch (error) {
          const errorMsg = `Failed to insert batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
          result.errors.push(errorMsg)
        }
      }

      result.inserted = totalInserted
      result.success = result.errors.length === 0

      if (result.success) {
        result.message = `Successfully seeded ${result.inserted} foods (${result.skipped} already existed)`
      } else {
        result.message = `Partially completed: ${result.inserted} inserted, ${result.errors.length} errors`
      }

      return result
    } catch (error) {
      result.success = false
      result.message = `Seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      result.errors.push(result.message)
      return result
    }
  }

  /**
   * Get seeding status and statistics
   */
  async getSeedingStatus(): Promise<{
    totalFoods: number
    seedDataCount: number
    missingFoods: string[]
    existingFoods: string[]
  }> {
    const existingFoods = await this.db
      .select({ name: food.name })
      .from(food)
      .orderBy(food.name)

    const existingNames = existingFoods.map((f) => f.name)
    const seedNames = KOREAN_FOODS.map((f) => f.name)

    const missingFoods = seedNames.filter(
      (name) => !existingNames.includes(name),
    )

    return {
      totalFoods: existingFoods.length,
      seedDataCount: KOREAN_FOODS.length,
      missingFoods,
      existingFoods: existingNames,
    }
  }
}
