import { describe, it, expect, beforeEach } from 'vitest'
import { createRuntimeAuth } from '../createRuntimeAuth'

// Mock environment for testing
const mockEnv: Env = {
  DB: {} as D1Database, // This would be mocked properly in a real test
  BETTER_AUTH_SECRET: 'test-secret',
  BETTER_AUTH_URL: 'http://localhost:5173',
  CLOUDFLARE_ACCOUNT_ID: '',
  CLOUDFLARE_DATABASE_ID: '',
  CLOUDFLARE_D1_TOKEN: '',
}

describe('Better-auth Configuration', () => {
  let auth: ReturnType<typeof createRuntimeAuth>

  beforeEach(() => {
    auth = createRuntimeAuth(mockEnv)
  })

  it('should create auth instance with anonymous plugin', () => {
    expect(auth).toBeDefined()
    expect(auth.api).toBeDefined()
    expect(auth.handler).toBeDefined()
  })

  it('should have nationality field in user schema', () => {
    // This test verifies the configuration is set up correctly
    // In a real test environment, we would test actual user creation
    expect(auth.options.user?.additionalFields?.nationality).toBeDefined()
    expect(auth.options.user?.additionalFields?.nationality?.required).toBe(
      false,
    )
    expect(auth.options.user?.additionalFields?.nationality?.defaultValue).toBe(
      'unknown',
    )
  })

  it('should have anonymous plugin configured', () => {
    // Verify anonymous plugin is in the plugins array
    const hasAnonymousPlugin = auth.options.plugins?.some(
      (plugin) => typeof plugin === 'object' && plugin.id === 'anonymous',
    )
    expect(hasAnonymousPlugin).toBe(true)
  })
})
