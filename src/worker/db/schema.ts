export * from './auth-schema'

import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { user } from './auth-schema'

// Custom Food table
export const food = sqliteTable('food', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  imageUrl: text('image_url').notNull(),
  eloScore: integer('elo_score').default(1200).notNull(),
  totalVotes: integer('total_votes').default(0).notNull(), // Total number of votes including skip votes
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`), // ISO 8601 format
  updatedAt: text('updated_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date().toISOString()), // Auto-update on changes
})

// Custom Vote table
export const vote = sqliteTable(
  'vote',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pairKey: text('pair_key').notNull(), // Normalized: min(foodA,foodB)+'_'+max(foodA,foodB)
    foodLowId: text('food_low_id').references(() => food.id), // Normalized min ID
    foodHighId: text('food_high_id').references(() => food.id), // Normalized max ID
    presentedLeftId: text('presented_left_id').references(() => food.id), // UI display order
    presentedRightId: text('presented_right_id').references(() => food.id), // UI display order
    result: text('result', {
      enum: ['win', 'tie', 'skip'],
    }).notNull(),
    winnerFoodId: text('winner_food_id').references(() => food.id), // Only set when result='win'
    userId: text('user_id')
      .notNull()
      .references(() => user.id), // References better-auth user table
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`), // ISO 8601 TEXT format
  },
  (table) => [
    // Composite unique index to prevent duplicate voting on same pairing
    uniqueIndex('idx_vote_user_pair').on(table.userId, table.pairKey),
  ],
)

// Custom Comment table
export const comment = sqliteTable('comment', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  pairKey: text('pair_key').notNull(), // Same normalized pairKey as votes
  result: text('result', {
    enum: ['win', 'tie'],
  }).notNull(), // Skip votes don't generate comments
  winnerFoodId: text('winner_food_id').references(() => food.id), // Only set when result='win'
  content: text('content').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id), // References better-auth user table
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`), // ISO 8601 TEXT format
})

// Type inference
export type Food = typeof food.$inferSelect
export type Vote = typeof vote.$inferSelect
export type Comment = typeof comment.$inferSelect
