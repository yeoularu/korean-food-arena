import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useVoteStats, useComments, useCommentMutation } from '@/hooks'
import type { VoteStats, Comment } from '@/lib/types'

interface VoteStatsDisplayProps {
  stats: VoteStats
  pairKey: string
}

function VoteStatsDisplay({ stats }: VoteStatsDisplayProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Vote Results</h3>
        <p className="text-sm text-muted-foreground">
          {stats.totalVotes} total votes ({stats.skipCount} skipped)
        </p>
      </div>

      <div className="space-y-2">
        {Object.entries(stats.percentageByFoodId).map(
          ([foodId, percentage]) => (
            <div key={foodId} className="flex items-center justify-between">
              <span className="text-sm">Food {foodId}</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">
                  {percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          ),
        )}

        {stats.tiePercentage > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm">Tie</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-muted rounded-full h-2">
                <div
                  className="bg-secondary h-2 rounded-full"
                  style={{ width: `${stats.tiePercentage}%` }}
                />
              </div>
              <span className="text-sm font-medium w-12 text-right">
                {stats.tiePercentage.toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {Object.keys(stats.nationalityBreakdown).length > 0 && (
        <div className="mt-6">
          <h4 className="text-md font-medium mb-3">Breakdown by Nationality</h4>
          <p className="text-xs text-muted-foreground mb-3">
            Based on current nationality settings. Groups with fewer than 5
            users are shown as "Other".
          </p>
          <div className="space-y-3">
            {Object.entries(stats.nationalityBreakdown).map(
              ([nationality, data]) => (
                <div key={nationality} className="border rounded-lg p-3">
                  <h5 className="text-sm font-medium mb-2">
                    {nationality === 'unknown' ? 'Not specified' : nationality}
                  </h5>
                  <div className="space-y-1">
                    {Object.entries(data.byFoodId).map(([foodId, count]) => (
                      <div
                        key={foodId}
                        className="flex justify-between text-xs"
                      >
                        <span>Food {foodId}</span>
                        <span>{count} votes</span>
                      </div>
                    ))}
                    {data.tiePercentage > 0 && (
                      <div className="flex justify-between text-xs">
                        <span>Tie</span>
                        <span>{data.tiePercentage.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface CommentSectionProps {
  pairKey: string
  comments: Comment[]
  isLoading: boolean
}

function CommentSection({ pairKey, comments, isLoading }: CommentSectionProps) {
  const [newComment, setNewComment] = useState('')
  const commentMutation = useCommentMutation()

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      await commentMutation.mutateAsync({
        pairKey,
        result: 'win', // This should be determined based on the user's actual vote
        content: newComment.trim(),
      })
      setNewComment('')
    } catch (error) {
      console.error('Failed to submit comment:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Comments</h3>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Comments</h3>

      <form onSubmit={handleSubmitComment} className="space-y-2">
        <Textarea
          placeholder="Share your thoughts about this comparison..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          maxLength={280}
          disabled={commentMutation.isPending}
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            {newComment.length}/280 characters
          </span>
          <Button
            type="submit"
            disabled={!newComment.trim() || commentMutation.isPending}
            size="sm"
          >
            {commentMutation.isPending ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
      </form>

      {commentMutation.error && (
        <div className="text-sm text-destructive">
          Failed to post comment. Please try again.
        </div>
      )}

      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No comments yet. Be the first to share your thoughts!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border rounded-lg p-3">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-muted-foreground">
                  {comment.nationality && comment.nationality !== 'unknown'
                    ? comment.nationality
                    : 'Anonymous'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm">{comment.content}</p>
              {comment.result === 'win' && comment.winnerFoodId && (
                <div className="text-xs text-muted-foreground mt-1">
                  Chose: Food {comment.winnerFoodId}
                </div>
              )}
              {comment.result === 'tie' && (
                <div className="text-xs text-muted-foreground mt-1">
                  Voted: Tie
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

interface ResultsProps {
  pairKey: string
}

export function Results({ pairKey }: ResultsProps) {
  const navigate = useNavigate()
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useVoteStats(pairKey)
  const {
    data: comments = [],
    isLoading: commentsLoading,
    error: commentsError,
  } = useComments(pairKey)

  const handleContinue = () => {
    navigate({ to: '/' })
  }

  if (statsError || commentsError) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
        <p className="text-muted-foreground">
          You need to vote on this comparison before viewing results.
        </p>
        <Button onClick={() => navigate({ to: '/' })}>Go Back to Voting</Button>
      </div>
    )
  }

  if (statsLoading) {
    return (
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Loading results...</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">No Results Found</h2>
        <p className="text-muted-foreground">
          No voting data available for this comparison.
        </p>
        <Button onClick={() => navigate({ to: '/' })}>Go Back to Voting</Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Comparison Results</h1>
        <p className="text-muted-foreground mt-2">
          See how the community voted on this matchup
        </p>
      </div>

      <VoteStatsDisplay stats={stats} pairKey={pairKey} />

      <CommentSection
        pairKey={pairKey}
        comments={comments}
        isLoading={commentsLoading}
      />

      <div className="text-center">
        <Button onClick={handleContinue} size="lg">
          Continue to Next Comparison
        </Button>
      </div>
    </div>
  )
}
