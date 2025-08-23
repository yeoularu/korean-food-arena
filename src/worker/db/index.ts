import { drizzle } from 'drizzle-orm/d1'
import type { DrizzleD1Database } from 'drizzle-orm/d1'

export const getDb = (d1: D1Database): DrizzleD1Database => {
  if (!d1) {
    throw new Error('D1 database binding is not available')
  }

  return drizzle(d1)
}

export const withDbErrorHandling = async <T>(
  operation: () => Promise<T>,
  context: string = 'Database operation',
): Promise<T> => {
  try {
    return await operation()
  } catch (error) {
    console.error(`${context} failed:`, error)

    if (error instanceof Error) {
      // Handle specific D1 errors
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error('Duplicate entry detected')
      }
      if (error.message.includes('FOREIGN KEY constraint failed')) {
        throw new Error('Invalid reference to related data')
      }
      if (error.message.includes('NOT NULL constraint failed')) {
        throw new Error('Required field is missing')
      }
    }

    throw new Error(
      `${context} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}
