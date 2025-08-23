import { betterAuth, BetterAuthOptions } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { anonymous } from 'better-auth/plugins'

export const options: BetterAuthOptions = {
  user: {
    additionalFields: {
      nationality: {
        type: 'string',
        required: false, // Optional field - users can skip nationality selection
        input: true, // Allow users to set nationality
        // Standard: ISO 3166-1 alpha-2 country codes, 'unknown' for unspecified
        defaultValue: 'unknown',
      },
    },
  },
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
