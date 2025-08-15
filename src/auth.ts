import { betterAuth, BetterAuthOptions } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { anonymous } from 'better-auth/plugins'

export const options: BetterAuthOptions = {
  plugins: [anonymous()],
}

// for Better-Auth CLI only - Do not use in runtime
export const auth = betterAuth({
  ...options,
  database: drizzleAdapter({}, { provider: 'sqlite' }),
})

export type AuthVariables = {
  user: typeof auth.$Infer.Session.user | null
  session: typeof auth.$Infer.Session.session | null
}
