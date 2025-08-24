import { Context } from 'hono'
import { AuthVariables } from '../../auth'
import { AuthenticationError } from './errorHandling'

/**
 * Admin authentication middleware
 * Only accepts: `x-admin-api-key` header
 */
export function requireAdminAuth() {
  return async (
    c: Context<{ Bindings: Env; Variables: AuthVariables }>,
    next: () => Promise<void>,
  ) => {
    const adminApiKey = c.env.ADMIN_API_KEY

    // If no admin API key is configured, deny access
    if (!adminApiKey) {
      throw new AuthenticationError('Admin API is not configured')
    }

    // Only: x-admin-api-key header
    const providedKey = c.req.header('x-admin-api-key') || undefined

    if (!providedKey) {
      throw new AuthenticationError(
        'Admin API key is required. Provide it via the x-admin-api-key header.',
      )
    }

    // Constant-time comparison to prevent timing attacks
    if (!constantTimeEquals(providedKey, adminApiKey)) {
      throw new AuthenticationError('Invalid admin API key')
    }

    await next()
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}
