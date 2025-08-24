import { describe, it, expect, vi } from 'vitest'
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalServerError,
  errorHandler,
  asyncHandler,
  validateRequest,
  requireAuth,
  withErrorHandling,
} from '../errorHandling'
import { z } from 'zod'
import type { Context } from 'hono'

// Mock Hono context
interface MockUser {
  id: string
  name: string
}

const createMockContext = (user?: MockUser | null) =>
  ({
    json: vi.fn(
      (data: unknown, status?: number) =>
        new Response(JSON.stringify(data), { status }),
    ),
    get: vi.fn((key: string) => (key === 'user' ? user : null)),
  }) as unknown as Context

describe('Error Classes', () => {
  it('should create AppError with correct properties', () => {
    const error = new AppError(400, 'Bad Request', 'Invalid input', {
      field: 'name',
    })
    expect(error.code).toBe(400)
    expect(error.error).toBe('Bad Request')
    expect(error.message).toBe('Invalid input')
    expect(error.details).toEqual({ field: 'name' })
    expect(error.name).toBe('AppError')
  })

  it('should create ValidationError with 400 status', () => {
    const error = new ValidationError('Invalid data')
    expect(error.code).toBe(400)
    expect(error.error).toBe('Bad Request')
    expect(error.message).toBe('Invalid data')
  })

  it('should create AuthenticationError with 401 status', () => {
    const error = new AuthenticationError()
    expect(error.code).toBe(401)
    expect(error.error).toBe('Unauthorized')
    expect(error.message).toBe('Authentication required')
  })

  it('should create AuthorizationError with 403 status', () => {
    const error = new AuthorizationError()
    expect(error.code).toBe(403)
    expect(error.error).toBe('Forbidden')
    expect(error.message).toBe('Access denied')
  })

  it('should create NotFoundError with 404 status', () => {
    const error = new NotFoundError()
    expect(error.code).toBe(404)
    expect(error.error).toBe('Not Found')
    expect(error.message).toBe('Resource not found')
  })

  it('should create ConflictError with 409 status', () => {
    const error = new ConflictError()
    expect(error.code).toBe(409)
    expect(error.error).toBe('Conflict')
    expect(error.message).toBe('Resource conflict')
  })

  it('should create RateLimitError with 429 status', () => {
    const error = new RateLimitError()
    expect(error.code).toBe(429)
    expect(error.error).toBe('Too Many Requests')
    expect(error.message).toBe('Too many requests')
  })

  it('should create InternalServerError with 500 status', () => {
    const error = new InternalServerError()
    expect(error.code).toBe(500)
    expect(error.error).toBe('Internal Server Error')
    expect(error.message).toBe('Internal server error')
  })
})

describe('errorHandler', () => {
  it('should handle Zod validation errors', () => {
    const schema = z.object({ name: z.string().min(1) })
    const result = schema.safeParse({ name: '' })

    if (!result.success) {
      const context = createMockContext()
      errorHandler(result.error, context)

      expect(context.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
          message: 'Invalid request data',
          code: 400,
          details: expect.any(Array),
        }),
        400,
      )
    }
  })

  it('should handle AppError instances', () => {
    const error = new ValidationError('Invalid input')
    const context = createMockContext()

    errorHandler(error, context)

    expect(context.json).toHaveBeenCalledWith(
      {
        error: 'Bad Request',
        message: 'Invalid input',
        code: 400,
      },
      400,
    )
  })

  it('should handle SQLite unique constraint errors', () => {
    const error = new Error('UNIQUE constraint failed: idx_vote_user_pair')
    const context = createMockContext()

    errorHandler(error, context)

    expect(context.json).toHaveBeenCalledWith(
      {
        error: 'Conflict',
        message: 'You have already voted on this food pairing',
        code: 409,
      },
      409,
    )
  })

  it('should handle SQLite foreign key constraint errors', () => {
    const error = new Error('FOREIGN KEY constraint failed')
    const context = createMockContext()

    errorHandler(error, context)

    expect(context.json).toHaveBeenCalledWith(
      {
        error: 'Bad Request',
        message: 'Invalid reference to related resource',
        code: 400,
      },
      400,
    )
  })

  it('should handle timeout errors', () => {
    const error = new Error('Request timeout')
    error.name = 'TimeoutError'
    const context = createMockContext()

    errorHandler(error, context)

    expect(context.json).toHaveBeenCalledWith(
      {
        error: 'Request Timeout',
        message: 'Request timed out, please try again',
        code: 408,
      },
      408,
    )
  })

  it('should handle unknown errors as internal server error', () => {
    const error = new Error('Unknown error')
    const context = createMockContext()

    errorHandler(error, context)

    expect(context.json).toHaveBeenCalledWith(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        code: 500,
      },
      500,
    )
  })
})

describe('asyncHandler', () => {
  it('should handle successful async operations', async () => {
    const mockFn = vi.fn().mockResolvedValue(new Response('success'))
    const wrappedFn = asyncHandler(mockFn)
    const context = createMockContext()

    const result = await wrappedFn(context)

    expect(mockFn).toHaveBeenCalledWith(context)
    expect(result).toBeInstanceOf(Response)
  })

  it('should handle async errors', async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValue(new ValidationError('Invalid data'))
    const wrappedFn = asyncHandler(mockFn)
    const context = createMockContext()

    await wrappedFn(context)

    expect(context.json).toHaveBeenCalledWith(
      {
        error: 'Bad Request',
        message: 'Invalid data',
        code: 400,
      },
      400,
    )
  })
})

describe('validateRequest', () => {
  it('should validate and return valid data', () => {
    const schema = z.object({ name: z.string() })
    const data = { name: 'John' }

    const result = validateRequest(schema, data)

    expect(result).toEqual(data)
  })

  it('should throw ZodError for invalid data', () => {
    const schema = z.object({ name: z.string() })
    const data = { name: 123 }

    expect(() => validateRequest(schema, data)).toThrow()
  })
})

describe('requireAuth', () => {
  it('should return user when authenticated', () => {
    const user = { id: '1', name: 'John' }
    const context = createMockContext(user)

    const result = requireAuth(context)

    expect(result).toBe(user)
  })

  it('should throw AuthenticationError when not authenticated', () => {
    const context = createMockContext(null)

    expect(() => requireAuth(context)).toThrow(AuthenticationError)
  })
})

describe('withErrorHandling', () => {
  it('should return result of successful operation', async () => {
    const operation = vi.fn().mockResolvedValue('success')

    const result = await withErrorHandling(operation, 'test operation')

    expect(result).toBe('success')
    expect(operation).toHaveBeenCalled()
  })

  it('should re-throw AppError instances', async () => {
    const error = new ValidationError('Invalid data')
    const operation = vi.fn().mockRejectedValue(error)

    await expect(
      withErrorHandling(operation, 'test operation'),
    ).rejects.toThrow(ValidationError)
  })

  it('should handle database not initialized error', async () => {
    const error = new Error('no such table: users')
    const operation = vi.fn().mockRejectedValue(error)

    await expect(
      withErrorHandling(operation, 'test operation'),
    ).rejects.toThrow(InternalServerError)
  })

  it('should handle database locked error', async () => {
    const error = new Error('database is locked')
    const operation = vi.fn().mockRejectedValue(error)

    await expect(
      withErrorHandling(operation, 'test operation'),
    ).rejects.toThrow(InternalServerError)
  })

  it('should handle unknown errors', async () => {
    const error = new Error('Unknown database error')
    const operation = vi.fn().mockRejectedValue(error)

    await expect(
      withErrorHandling(operation, 'test operation'),
    ).rejects.toThrow(InternalServerError)
  })
})
