import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { requireAdminAuth } from '../adminAuth'
import { AuthVariables } from '../../../auth'
import { errorHandler } from '../errorHandling'

describe('requireAdminAuth', () => {
  const createApp = (adminApiKey?: string) => {
    const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

    // Mock environment
    app.use('*', async (c, next) => {
      c.env = { ADMIN_API_KEY: adminApiKey } as Env
      await next()
    })

    // Add error handler
    app.onError(errorHandler)

    app.get('/admin/test', requireAdminAuth(), (c) => c.json({ success: true }))
    return app
  }

  it('should deny access when no admin API key is configured', async () => {
    const app = createApp() // No API key configured

    const res = await app.request('/admin/test')

    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string; message: string }
    expect(body.error).toContain('Unauthorized')
  })

  it('should deny access when no API key is provided', async () => {
    const app = createApp('secret-key')

    const res = await app.request('/admin/test')

    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string; message: string }
    expect(body.message).toContain('Admin API key is required')
  })

  it('should deny access with invalid API key', async () => {
    const app = createApp('secret-key')

    const res = await app.request('/admin/test', {
      headers: { Authorization: 'Bearer wrong-key' },
    })

    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string; message: string }
    expect(body.message).toContain('Invalid admin API key')
  })

  it('should allow access with valid Authorization header', async () => {
    const app = createApp('secret-key')

    const res = await app.request('/admin/test', {
      headers: { Authorization: 'Bearer secret-key' },
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean }
    expect(body.success).toBe(true)
  })

  it('should allow access with valid x-api-key header', async () => {
    const app = createApp('secret-key')

    const res = await app.request('/admin/test', {
      headers: { 'x-api-key': 'secret-key' },
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean }
    expect(body.success).toBe(true)
  })

  it('should allow access with valid query parameter', async () => {
    const app = createApp('secret-key')

    const res = await app.request('/admin/test?api_key=secret-key')

    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean }
    expect(body.success).toBe(true)
  })

  it('should prioritize Authorization header over other methods', async () => {
    const app = createApp('secret-key')

    const res = await app.request('/admin/test?api_key=wrong-key', {
      headers: {
        Authorization: 'Bearer secret-key',
        'x-api-key': 'wrong-key',
      },
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean }
    expect(body.success).toBe(true)
  })
})
