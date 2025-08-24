import { Context } from 'hono'
import { z } from 'zod'
import { formatValidationError } from './validation'

// Standard error response interface
export interface ErrorResponse {
  error: string
  message: string
  code: number
  details?: unknown
}

// Error types
export class AppError extends Error {
  constructor(
    public code: number,
    public error: string,
    message: string,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, 'Bad Request', message, details)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(401, 'Unauthorized', message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(403, 'Forbidden', message)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(404, 'Not Found', message)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(409, 'Conflict', message)
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(429, 'Too Many Requests', message)
    this.name = 'RateLimitError'
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(500, 'Internal Server Error', message)
    this.name = 'InternalServerError'
  }
}

// Error handler middleware
export function errorHandler(error: unknown, c: Context): Response {
  console.error('API Error:', error)

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    const formattedError = formatValidationError(error)
    return c.json(formattedError, 400)
  }

  // Handle custom app errors
  if (error instanceof AppError) {
    const errorResponse: ErrorResponse = {
      error: error.error,
      message: error.message,
      code: error.code,
    }

    // Add details if they exist
    if (error.details) {
      errorResponse.details = error.details
    }

    return c.json(
      errorResponse,
      error.code as 400 | 401 | 403 | 404 | 409 | 429 | 500,
    )
  }

  // Handle database constraint errors
  if (error && typeof error === 'object' && 'message' in error) {
    const errorMessage = (error as Error).message

    // SQLite unique constraint violation
    if (errorMessage.includes('UNIQUE constraint failed')) {
      if (errorMessage.includes('idx_vote_user_pair')) {
        return c.json(
          {
            error: 'Conflict',
            message: 'You have already voted on this food pairing',
            code: 409,
          },
          409,
        )
      }
      return c.json(
        {
          error: 'Conflict',
          message: 'Resource already exists',
          code: 409,
        },
        409,
      )
    }

    // SQLite foreign key constraint violation
    if (errorMessage.includes('FOREIGN KEY constraint failed')) {
      return c.json(
        {
          error: 'Bad Request',
          message: 'Invalid reference to related resource',
          code: 400,
        },
        400,
      )
    }
  }

  // Handle network/timeout errors
  if (error && typeof error === 'object' && 'name' in error) {
    const errorName = (error as Error).name

    if (errorName === 'TimeoutError' || errorName === 'AbortError') {
      return c.json(
        {
          error: 'Request Timeout',
          message: 'Request timed out, please try again',
          code: 408,
        },
        408,
      )
    }
  }

  // Default to internal server error
  return c.json(
    {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      code: 500,
    },
    500,
  )
}

// Async error wrapper for route handlers
export function asyncHandler(fn: (c: Context) => Promise<Response>) {
  return async (c: Context): Promise<Response> => {
    try {
      return await fn(c)
    } catch (error) {
      return errorHandler(error, c)
    }
  }
}

// Validation helper
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw result.error
  }
  return result.data
}

// Authentication helper
export function requireAuth(c: Context) {
  const user = c.get('user')
  if (!user) {
    throw new AuthenticationError()
  }
  return user
}

// Authorization helper for vote access control
export async function requireVoteAccess(
  db: ReturnType<typeof import('../db').getDb>,
  userId: string,
  pairKey: string,
  errorMessage: string = 'You must vote on this pairing before accessing this resource',
) {
  const { vote } = await import('../db/schema')
  const { eq, and } = await import('drizzle-orm')

  const userVote = await db
    .select()
    .from(vote)
    .where(and(eq(vote.userId, userId), eq(vote.pairKey, pairKey)))
    .limit(1)

  if (userVote.length === 0) {
    throw new AuthorizationError(errorMessage)
  }

  return userVote[0]
}

// Database operation wrapper with error handling
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    console.error(`Database operation failed (${context}):`, error)

    // Re-throw known errors
    if (error instanceof AppError) {
      throw error
    }

    // Handle database-specific errors
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = (error as Error).message

      if (errorMessage.includes('no such table')) {
        throw new InternalServerError('Database not properly initialized')
      }

      if (errorMessage.includes('database is locked')) {
        throw new InternalServerError(
          'Database temporarily unavailable, please try again',
        )
      }
    }

    throw new InternalServerError(`Failed to ${context}`)
  }
}
