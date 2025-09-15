import type { Comment, EnhancedComment } from '@/lib/types'
import { CommentErrorBoundary } from './CommentErrorBoundary'
import { FlagDisplay } from './FlagDisplay'

interface CommentCardProps {
  comment: Comment | EnhancedComment
  showPairingContext?: boolean
  foodNamesById?: Record<string, string>
}

function isEnhancedComment(
  comment: Comment | EnhancedComment,
): comment is EnhancedComment {
  return (
    'isCurrentPairing' in comment &&
    'otherFoodId' in comment &&
    'otherFoodName' in comment
  )
}

function CommentCardContent({
  comment,
  showPairingContext = false,
  foodNamesById,
}: CommentCardProps) {
  const isEnhanced = isEnhancedComment(comment)
  const shouldShowContext =
    showPairingContext && isEnhanced && !comment.isCurrentPairing

  // Handle missing or invalid comment data
  if (!comment || !comment.id || !comment.content) {
    return (
      <div className="border rounded-lg p-3 bg-muted/20 shadow-sm">
        <div className="text-sm text-muted-foreground italic">
          Comment data unavailable
        </div>
      </div>
    )
  }

  // Safely format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return 'Unknown date'
      }
      return date.toLocaleDateString()
    } catch {
      return 'Unknown date'
    }
  }

  // Safely get food name
  const getFoodName = (foodId: string) => {
    if (!foodId) return 'Unknown Food'
    return foodNamesById?.[foodId] || `Food ${foodId}`
  }

  // Safely get nationality display with flag
  const getNationalityDisplay = () => {
    if (!comment.nationality || comment.nationality === 'unknown') {
      return {
        text: 'Anonymous',
        countryCode: undefined,
        showFlag: false,
      }
    }
    if (comment.nationality === 'Other') {
      return {
        text: 'Other',
        countryCode: undefined,
        showFlag: false,
      }
    }
    // For actual country codes, use FlagDisplay
    return {
      text: comment.nationality,
      countryCode: comment.nationality,
      showFlag: true,
    }
  }

  return (
    <div
      className="border rounded-lg p-3 bg-card shadow-sm"
      role="article"
      aria-label={`Comment by ${getNationalityDisplay().text} user`}
    >
      {/* Header with nationality and date */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded-full font-medium flex items-center gap-1"
            aria-label="User nationality"
          >
            {(() => {
              const nationalityDisplay = getNationalityDisplay()
              if (nationalityDisplay.showFlag) {
                return (
                  <FlagDisplay
                    countryCode={nationalityDisplay.countryCode}
                    showName={true}
                    size="sm"
                  />
                )
              }
              return nationalityDisplay.text
            })()}
          </span>
          {shouldShowContext && (
            <span
              className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-full border border-blue-200 dark:border-blue-800"
              aria-label="Comment from different pairing"
            >
              From other pairing
            </span>
          )}
        </div>
        <time
          className="text-xs text-muted-foreground"
          dateTime={comment.createdAt}
          aria-label={`Posted on ${formatDate(comment.createdAt)}`}
        >
          {formatDate(comment.createdAt)}
        </time>
      </div>

      {/* Comment content with safe rendering */}
      <p className="text-sm text-foreground mb-2 leading-relaxed">
        {comment.content || 'No content available'}
      </p>

      {/* Vote result and context information */}
      <div className="space-y-1">
        {/* Vote result */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Voted:
          </span>
          {comment.result === 'win' && comment.winnerFoodId ? (
            <span
              className="text-xs px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded border border-green-200 dark:border-green-800"
              aria-label={`Voted for ${getFoodName(comment.winnerFoodId)}`}
            >
              {getFoodName(comment.winnerFoodId)}
            </span>
          ) : (
            <span
              className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded border"
              aria-label="Voted for tie"
            >
              Tie
            </span>
          )}
        </div>

        {/* Pairing context for expanded comments */}
        {shouldShowContext && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <span>From pairing with:</span>
            <span
              className="font-medium text-foreground"
              aria-label={`Other food in pairing: ${comment.otherFoodName || 'Unknown Food'}`}
            >
              {comment.otherFoodName || 'Unknown Food'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// Main component wrapped with error boundary
export function CommentCard(props: CommentCardProps) {
  return (
    <CommentErrorBoundary
      context="comments"
      onError={(error, errorInfo) => {
        console.error('CommentCard error:', error, errorInfo)
      }}
      fallback={
        <div className="border rounded-lg p-3 bg-muted/20 shadow-sm">
          <div className="text-sm text-muted-foreground italic">
            Unable to display this comment
          </div>
        </div>
      }
    >
      <CommentCardContent {...props} />
    </CommentErrorBoundary>
  )
}
