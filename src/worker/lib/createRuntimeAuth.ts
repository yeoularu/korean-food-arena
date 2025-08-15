import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { drizzle } from 'drizzle-orm/d1'
import { options } from '../../auth'
import * as authSchema from '../db/auth-schema'

export const createRuntimeAuth = (env: Env) => {
  return betterAuth({
    ...options,
    database: drizzleAdapter(drizzle(env.DB), {
      provider: 'sqlite',
      schema: { ...authSchema },
    }),
  })
}
