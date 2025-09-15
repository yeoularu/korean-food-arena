import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from './ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  onRetry?: () => void
  context?: 'comments' | 'comment-creation' | 'expanded-comments'
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class CommentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CommentErrorBoundary caught an error:', error, errorInfo)

    this.setState({
      error,
      errorInfo,
    })

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log error with context for debugging
    console.error(`Comment error in ${this.props.context || 'unknown'}:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.context,
    })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })

    // Call optional retry handler
    if (this.props.onRetry) {
      this.props.onRetry()
    }
  }

  getContextualErrorMessage = (): string => {
    switch (this.props.context) {
      case 'comments':
        return 'Unable to display comments. This might be due to a temporary issue.'
      case 'comment-creation':
        return 'Unable to load the comment form. Please try refreshing the page.'
      case 'expanded-comments':
        return 'Unable to load expanded comments. Some comments may not be visible.'
      default:
        return 'Something went wrong with the comment system.'
    }
  }

  getContextualRetryLabel = (): string => {
    switch (this.props.context) {
      case 'comments':
        return 'Reload Comments'
      case 'comment-creation':
        return 'Reload Form'
      case 'expanded-comments':
        return 'Reload Expanded Comments'
      default:
        return 'Try Again'
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Context-aware fallback UI
      return (
        <div
          className="rounded-lg border border-destructive/20 bg-destructive/5 p-6"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-destructive"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
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
              <h3 className="text-sm font-medium text-destructive mb-2">
                Comment System Error
              </h3>

              <p className="text-sm text-destructive/80 mb-4">
                {this.getContextualErrorMessage()}
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-4">
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                    Error Details (Development)
                  </summary>
                  <div className="mt-2 p-3 bg-muted rounded text-xs font-mono overflow-auto max-h-32">
                    <div className="text-destructive font-semibold mb-1">
                      {this.state.error.name}: {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <pre className="whitespace-pre-wrap text-muted-foreground">
                        {this.state.error.stack}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={this.handleRetry}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  {this.getContextualRetryLabel()}
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                >
                  Refresh Page
                </Button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for wrapping comment components with error boundary
export function withCommentErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  context?: Props['context'],
  onError?: (error: Error, errorInfo: ErrorInfo) => void,
) {
  const WrappedComponent = (props: P) => (
    <CommentErrorBoundary context={context} onError={onError}>
      <Component {...props} />
    </CommentErrorBoundary>
  )

  WrappedComponent.displayName = `withCommentErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}
