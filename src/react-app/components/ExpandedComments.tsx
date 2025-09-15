import { useState, useCallback } from 'react'
import { CommentCard } from './CommentCard'
import {
  LoadingSpinner,
  CommentsSkeleton,
  CommentSkeleton,
} from './LoadingSpinner'
import {
  ErrorMessage,
  CommentLoadErrorMessage,
  CommentAccessErrorMessage,
  NoCommentsMessage,
} from './ErrorMessage'
import { InlineOfflineIndicator } from './OfflineIndicator'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { Button } from './ui/button'
import { useExpandedComments } from '@/hooks/use-comment-queries'
import { CommentErrorBoundary } from './CommentErrorBoundary'
import { isApiError } from '@/lib/types'

interface ExpandedCommentsProps {
  pairKey: string
  foodId1: string
  foodId2: string
  currentPairingLimit?: number
  expandedLimit?: number
  foodNamesById?: Record<string, string>
}

function ExpandedCommentsContent({
  pairKey,
  foodId1,
  foodId2,
  currentPairingLimit = 10,
  expandedLimit = 10,
  foodNamesById = {},
}: ExpandedCommentsProps) {
  const [loadMoreOptions, setLoadMoreOptions] = useState({
    currentPairingLimit,
    expandedLimit,
    includeExpanded: true,
  })

  const { isOnline } = useNetworkStatus()
  const {
    data: comments,
    isLoading,
    error,
    refetch,
    isFetching,
    isError,
  } = useExpandedComments(pairKey, foodId1, foodId2, loadMoreOptions)

  const handleLoadMore = useCallback(() => {
    setLoadMoreOptions((prev) => ({
      ...prev,
      expandedLimit: prev.expandedLimit + 10,
    }))
  }, [])

  const handleRetry = useCallback(() => {
    refetch()
  }, [refetch])

  // Enhanced loading state with proper skeleton
  if (isLoading) {
    return (
      <CommentsSkeleton
        count={3}
        showExpandedSection={loadMoreOptions.includeExpanded}
      />
    )
  }

  // Enhanced error state with specific error handling
  if (isError && error) {
    // Handle specific API errors
    if (isApiError(error)) {
      switch (error.code) {
        case 403:
          return <CommentAccessErrorMessage />
        case 401:
          return (
            <ErrorMessage
              error="Please refresh the page to continue viewing comments."
              onRetry={() => window.location.reload()}
            />
          )
        case 404:
          return <NoCommentsMessage context="general" canComment={false} />
        default:
          return (
            <CommentLoadErrorMessage
              context="expanded-comments"
              onRetry={handleRetry}
            />
          )
      }
    }

    // Handle network and other errors
    return (
      <div
        className="space-y-4"
        role="region"
        aria-label="Error loading comments"
      >
        <CommentLoadErrorMessage
          context="expanded-comments"
          onRetry={handleRetry}
        />
      </div>
    )
  }

  // Enhanced no comments state
  if (
    !comments ||
    (comments.currentPairingComments.length === 0 &&
      comments.expandedComments.length === 0)
  ) {
    return <NoCommentsMessage context="general" canComment={true} />
  }

  const hasCurrentPairingComments = comments.currentPairingComments.length > 0
  const hasExpandedComments = comments.expandedComments.length > 0
  const canLoadMore = comments.hasMore && !isFetching

  return (
    <div className="space-y-6" role="region" aria-label="Comments section">
      {/* Offline indicator */}
      {!isOnline && (
        <InlineOfflineIndicator message="Comments require an internet connection to load and update" />
      )}

      {/* Current Pairing Comments Section */}
      {hasCurrentPairingComments && (
        <section aria-labelledby="current-pairing-heading">
          <h3
            id="current-pairing-heading"
            className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"
          >
            <span
              className="w-1 h-6 bg-primary rounded-full"
              aria-hidden="true"
            />
            Comments on this pairing
            <span className="text-sm font-normal text-muted-foreground">
              ({comments.currentPairingComments.length})
            </span>
          </h3>
          <div className="space-y-3" role="list">
            {comments.currentPairingComments.map((comment) => (
              <div key={comment.id} role="listitem">
                <CommentCard
                  comment={comment}
                  showPairingContext={false}
                  foodNamesById={foodNamesById}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Expanded Comments Section */}
      {hasExpandedComments && (
        <section aria-labelledby="expanded-comments-heading">
          <h3
            id="expanded-comments-heading"
            className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"
          >
            <span
              className="w-1 h-6 bg-secondary rounded-full"
              aria-hidden="true"
            />
            More comments about these foods
            <span className="text-sm font-normal text-muted-foreground">
              ({comments.expandedComments.length})
            </span>
          </h3>
          <div className="space-y-3" role="list">
            {comments.expandedComments.map((comment) => (
              <div key={comment.id} role="listitem">
                <CommentCard
                  comment={comment}
                  showPairingContext={true}
                  foodNamesById={foodNamesById}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Load More Button with enhanced loading state */}
      {canLoadMore && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleLoadMore}
            variant="outline"
            disabled={isFetching}
            className="min-w-32"
            aria-label="Load more comments"
          >
            {isFetching ? (
              <>
                <LoadingSpinner size="sm" />
                Loading...
              </>
            ) : (
              'Load more comments'
            )}
          </Button>
        </div>
      )}

      {/* Enhanced loading indicator for additional content */}
      {isFetching && comments && (
        <div className="space-y-3">
          <div className="flex justify-center py-2">
            <LoadingSpinner size="sm" message="Loading more comments..." />
          </div>
          {/* Show skeleton for loading comments */}
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <CommentSkeleton key={`loading-${i}`} showContext={true} />
            ))}
          </div>
        </div>
      )}

      {/* Enhanced total count indicator */}
      {(hasCurrentPairingComments || hasExpandedComments) && (
        <div className="text-center text-sm text-muted-foreground pt-2 border-t">
          <div className="flex items-center justify-center gap-2">
            <span>
              Showing {comments.totalCount} comment
              {comments.totalCount !== 1 ? 's' : ''}
            </span>
            {comments.hasMore && (
              <>
                <span>•</span>
                <span className="text-primary">More available</span>
              </>
            )}
          </div>
          {comments.hasMore && (
            <div className="text-xs text-muted-foreground/70 mt-1">
              Click "Load more" to see additional comments
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Main component wrapped with error boundary
export function ExpandedComments(props: ExpandedCommentsProps) {
  return (
    <CommentErrorBoundary
      context="expanded-comments"
      onError={(error, errorInfo) => {
        console.error('ExpandedComments error:', error, errorInfo)
      }}
    >
      <ExpandedCommentsContent {...props} />
    </CommentErrorBoundary>
  )
}
