import { Button } from './ui/button'

export interface ApiError {
  error: string
  message: string
  code: number
  details?: Record<string, unknown>
}

interface ErrorMessageProps {
  error: Error | ApiError | string | null
  onRetry?: () => void
  className?: string
  showDetails?: boolean
}

export function ErrorMessage({
  error,
  onRetry,
  className = '',
  showDetails = false,
}: ErrorMessageProps) {
  if (!error) return null

  const getErrorMessage = (error: Error | ApiError | string): string => {
    if (typeof error === 'string') return error
    if ('message' in error) return error.message
    return 'An unexpected error occurred'
  }

  const getErrorCode = (
    error: Error | ApiError | string,
  ): number | undefined => {
    if (typeof error === 'object' && 'code' in error) {
      return error.code
    }
    return undefined
  }

  const getErrorDetails = (
    error: Error | ApiError | string,
  ): string | undefined => {
    if (typeof error === 'object' && 'details' in error && error.details) {
      return JSON.stringify(error.details, null, 2)
    }
    if (
      typeof error === 'object' &&
      'stack' in error &&
      process.env.NODE_ENV === 'development'
    ) {
      return error.stack
    }
    return undefined
  }

  const getUserFriendlyMessage = (error: Error | ApiError | string): string => {
    const code = getErrorCode(error)
    const message = getErrorMessage(error)

    switch (code) {
      case 400:
        return 'Please check your input and try again.'
      case 401:
        return 'Please refresh the page to continue.'
      case 403:
        return 'You need to vote on this pairing before viewing results.'
      case 404:
        return 'The requested resource was not found.'
      case 409:
        return 'You have already voted on this food pairing.'
      case 429:
        return 'Too many requests. Please wait a moment and try again.'
      case 500:
        return 'Server error. Please try again in a moment.'
      default:
        // Check for common network errors
        if (
          message.toLowerCase().includes('network') ||
          message.toLowerCase().includes('fetch') ||
          message.toLowerCase().includes('connection')
        ) {
          return 'Network error. Please check your connection and try again.'
        }
        return message || 'An unexpected error occurred.'
    }
  }

  const errorCode = getErrorCode(error)
  const userMessage = getUserFriendlyMessage(error)
  const details = getErrorDetails(error)

  return (
    <div
      className={`rounded-lg border border-destructive/20 bg-destructive/5 p-4 ${className}`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-destructive">
              {errorCode ? `Error ${errorCode}` : 'Error'}
            </h3>
            {onRetry && (
              <Button
                onClick={onRetry}
                variant="outline"
                size="sm"
                className="ml-3"
              >
                Try Again
              </Button>
            )}
          </div>

          <p className="mt-1 text-sm text-destructive/80">{userMessage}</p>

          {showDetails && details && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                Technical Details
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs font-mono overflow-auto max-h-32 text-muted-foreground">
                {details}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}

// Specific error message components for common scenarios
export function NetworkErrorMessage({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorMessage
      error="Unable to connect to the server. Please check your internet connection."
      onRetry={onRetry}
    />
  )
}

export function ValidationErrorMessage({
  message,
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <ErrorMessage
      error={message || 'Please check your input and try again.'}
      onRetry={onRetry}
    />
  )
}

export function AuthErrorMessage({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorMessage
      error="Authentication required. Please refresh the page to continue."
      onRetry={onRetry || (() => window.location.reload())}
    />
  )
}

// Comment-specific error message components
export function CommentLoadErrorMessage({
  onRetry,
  context = 'comments',
}: {
  onRetry?: () => void
  context?: 'comments' | 'expanded-comments' | 'comment-creation'
}) {
  const getContextualMessage = () => {
    switch (context) {
      case 'comments':
        return 'Unable to load comments. This might be due to a temporary server issue.'
      case 'expanded-comments':
        return 'Unable to load expanded comments. Some comments may not be visible.'
      case 'comment-creation':
        return 'Unable to load the comment form. Please try refreshing the page.'
      default:
        return 'Unable to load comments. Please try again.'
    }
  }

  return <ErrorMessage error={getContextualMessage()} onRetry={onRetry} />
}

export function CommentSubmissionErrorMessage({
  error,
  onRetry,
}: {
  error?: Error | ApiError | string | null
  onRetry?: () => void
}) {
  const getSubmissionErrorMessage = (
    error: Error | ApiError | string | null | undefined,
  ): string => {
    if (!error) return 'Failed to submit comment. Please try again.'

    const code =
      typeof error === 'object' && 'code' in error ? error.code : undefined
    const message =
      typeof error === 'string'
        ? error
        : typeof error === 'object' && 'message' in error
          ? error.message
          : 'Unknown error'

    switch (code) {
      case 400:
        if (message.includes('280')) {
          return 'Comment is too long. Please keep it under 280 characters.'
        }
        return 'Invalid comment content. Please check your input and try again.'
      case 401:
        return 'Please refresh the page to continue commenting.'
      case 403:
        return 'You need to vote on this pairing before commenting.'
      case 409:
        return 'You have already commented on this pairing.'
      case 429:
        return 'Too many comments submitted. Please wait a moment before trying again.'
      case 500:
        return 'Server error occurred. Please try again in a moment.'
      default:
        if (
          message.toLowerCase().includes('network') ||
          message.toLowerCase().includes('fetch') ||
          message.toLowerCase().includes('connection')
        ) {
          return 'Network error. Please check your connection and try again.'
        }
        return message || 'Failed to submit comment. Please try again.'
    }
  }

  return (
    <ErrorMessage error={getSubmissionErrorMessage(error)} onRetry={onRetry} />
  )
}

export function CommentAccessErrorMessage() {
  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            Vote Required
          </h3>
          <p className="text-sm text-yellow-700 mb-3">
            You need to vote on this food pairing before you can view comments.
            This helps prevent bias and ensures fair comparisons.
          </p>
          <p className="text-xs text-yellow-600">
            Cast your vote above to unlock the comments section.
          </p>
        </div>
      </div>
    </div>
  )
}

export function NoCommentsMessage({
  context = 'general',
  canComment = false,
}: {
  context?: 'general' | 'current-pairing' | 'expanded'
  canComment?: boolean
}) {
  const getMessage = () => {
    switch (context) {
      case 'current-pairing':
        return {
          title: 'No comments on this pairing yet',
          message: canComment
            ? 'Be the first to share your thoughts about this specific comparison!'
            : 'No one has commented on this pairing yet.',
        }
      case 'expanded':
        return {
          title: 'No additional comments found',
          message:
            'No comments from other pairings involving these foods were found.',
        }
      default:
        return {
          title: 'No comments yet',
          message: canComment
            ? 'Be the first to share your thoughts!'
            : 'No comments have been posted yet.',
        }
    }
  }

  const { title, message } = getMessage()

  return (
    <div className="text-center py-8 text-muted-foreground">
      <div className="space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg
            className="w-6 h-6 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <p className="text-lg font-medium">{title}</p>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  )
}
