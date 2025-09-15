import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useExpandedCommentMutation } from '@/hooks/use-comment-queries'
import {
  ErrorMessage,
  CommentSubmissionErrorMessage,
} from '@/components/ErrorMessage'
import {
  LoadingSpinner,
  CommentCreationSkeleton,
} from '@/components/LoadingSpinner'
import { CommentErrorBoundary } from '@/components/CommentErrorBoundary'
import { InlineOfflineIndicator } from '@/components/OfflineIndicator'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { NationalitySelector } from '@/components/NationalitySelector'

interface CommentCreationProps {
  pairKey: string
  foodNamesById?: Record<string, string>
  userVoteForComment?: { result: 'win' | 'tie'; winnerFoodId?: string } | null
}

function CommentCreationContent({
  pairKey,
  foodNamesById = {},
  userVoteForComment,
}: CommentCreationProps) {
  const [newComment, setNewComment] = useState('')
  // Default to 'tie' to avoid invalid payloads when user doesn't choose a winner
  const [selectedResult, setSelectedResult] = useState<'win' | 'tie'>('tie')
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | undefined>(
    undefined,
  )
  const [isInitializing, setIsInitializing] = useState(true)
  const [nationalityError, setNationalityError] = useState<string | null>(null)
  const { isOnline } = useNetworkStatus()
  const commentMutation = useExpandedCommentMutation()

  // Prefer server-provided vote to lock selection; fallback stays 'tie' if absent
  useEffect(() => {
    if (!userVoteForComment) {
      setIsInitializing(false)
      return
    }

    if (
      userVoteForComment.result === 'win' &&
      userVoteForComment.winnerFoodId
    ) {
      setSelectedResult('win')
      setSelectedWinnerId(userVoteForComment.winnerFoodId)
    } else if (userVoteForComment.result === 'tie') {
      setSelectedResult('tie')
      setSelectedWinnerId(undefined)
    }

    setIsInitializing(false)
  }, [userVoteForComment])

  // Handle nationality change events
  const handleNationalityChange = (_nationality: string | undefined) => {
    // Clear any previous nationality errors when user makes a change
    setNationalityError(null)
  }

  // Handle nationality update errors
  const handleNationalityError = (error: unknown) => {
    console.error('Nationality update failed:', error)
    setNationalityError(
      'Failed to update nationality. Your comment will still be posted.',
    )
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      await commentMutation.mutateAsync({
        pairKey,
        result: selectedResult,
        winnerFoodId: selectedResult === 'win' ? selectedWinnerId : undefined,
        content: newComment.trim(),
      })
      setNewComment('')
      // If not locked by server vote, reset selection back to tie after successful submit
      if (!userVoteForComment) {
        setSelectedResult('tie')
        setSelectedWinnerId(undefined)
      }
    } catch (error) {
      console.error('Failed to submit comment:', error)
    }
  }

  const locked = !!userVoteForComment
  const isSubmitting = commentMutation.isPending
  const hasError = commentMutation.isError
  const isFormDisabled = isSubmitting || isInitializing || !isOnline

  // Show loading skeleton while initializing
  if (isInitializing) {
    return <CommentCreationSkeleton />
  }

  // Validate that we have food names
  const foodEntries = Object.entries(foodNamesById || {})
  if (foodEntries.length === 0) {
    return (
      <ErrorMessage
        error="Unable to load food information for commenting."
        onRetry={() => window.location.reload()}
      />
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Add Your Comment</h3>

      {/* Offline indicator */}
      {!isOnline && (
        <InlineOfflineIndicator message="You need an internet connection to post comments" />
      )}

      {/* Vote context for this comment */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Your vote for this comment
        </p>
        {locked && (
          <p className="text-xs text-muted-foreground">
            Locked to your vote:{' '}
            {selectedResult === 'win' && selectedWinnerId
              ? `Chose ${foodNamesById?.[selectedWinnerId] || selectedWinnerId}`
              : 'Tie'}
          </p>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-2 sm:space-y-0">
          {/* Food options (win) */}
          {foodEntries.map(([id, name]) => (
            <label key={id} className="inline-flex items-center space-x-2">
              <input
                type="radio"
                name="comment-vote"
                value={id}
                checked={selectedResult === 'win' && selectedWinnerId === id}
                disabled={locked || isFormDisabled}
                onChange={() => {
                  setSelectedResult('win')
                  setSelectedWinnerId(id)
                }}
                aria-describedby={locked ? 'vote-locked-help' : undefined}
              />
              <span
                className={`text-sm ${isFormDisabled ? 'text-muted-foreground' : ''}`}
              >
                {name}
              </span>
            </label>
          ))}
          {/* Tie option */}
          <label className="inline-flex items-center space-x-2">
            <input
              type="radio"
              name="comment-vote"
              value="tie"
              checked={selectedResult === 'tie'}
              disabled={locked || isFormDisabled}
              onChange={() => {
                setSelectedResult('tie')
                setSelectedWinnerId(undefined)
              }}
              aria-describedby={locked ? 'vote-locked-help' : undefined}
            />
            <span
              className={`text-sm ${isFormDisabled ? 'text-muted-foreground' : ''}`}
            >
              Tie
            </span>
          </label>
        </div>
      </div>

      {/* Nationality selection */}
      <div className="space-y-2">
        <NationalitySelector
          compact
          showLabel
          disabled={isFormDisabled}
          onNationalityChange={handleNationalityChange}
          onError={handleNationalityError}
          className="text-sm"
        />

        {/* Nationality error display */}
        {nationalityError && (
          <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 p-2 rounded border border-amber-200 dark:border-amber-800">
            {nationalityError}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmitComment} className="space-y-2">
        <div className="relative">
          <Textarea
            placeholder="Share your thoughts about this comparison..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            maxLength={280}
            disabled={isFormDisabled}
            className={isFormDisabled ? 'opacity-50' : ''}
            aria-describedby="char-count comment-help"
          />
          {isSubmitting && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded">
              <LoadingSpinner size="sm" />
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span
              id="char-count"
              className={`text-xs ${
                newComment.length > 250
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              }`}
            >
              {newComment.length}/280 characters
            </span>
            {newComment.length > 250 && (
              <span className="text-xs text-destructive">
                {280 - newComment.length} characters remaining
              </span>
            )}
          </div>

          <Button
            type="submit"
            disabled={
              !newComment.trim() ||
              isFormDisabled ||
              (selectedResult === 'win' && !selectedWinnerId) ||
              newComment.length > 280
            }
            size="sm"
            className="min-w-24"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" />
                Posting...
              </>
            ) : (
              'Post Comment'
            )}
          </Button>
        </div>
      </form>

      {/* Enhanced error handling */}
      {hasError && (
        <CommentSubmissionErrorMessage
          error={commentMutation.error}
          onRetry={() => {
            commentMutation.reset()
            // Optionally retry the submission
            if (newComment.trim()) {
              handleSubmitComment(new Event('submit') as any)
            }
          }}
        />
      )}

      {/* Help text */}
      <div id="comment-help" className="text-xs text-muted-foreground">
        {locked ? (
          <span id="vote-locked-help">
            Your vote selection is locked based on your actual vote for this
            pairing. You can still update your nationality preference above.
          </span>
        ) : (
          'Select your vote preference, optionally set your nationality, and share your thoughts about this food comparison.'
        )}
      </div>
    </div>
  )
}

// Main component wrapped with error boundary
export function CommentCreation(props: CommentCreationProps) {
  return (
    <CommentErrorBoundary
      context="comment-creation"
      onError={(error, errorInfo) => {
        console.error('CommentCreation error:', error, errorInfo)
      }}
    >
      <CommentCreationContent {...props} />
    </CommentErrorBoundary>
  )
}
