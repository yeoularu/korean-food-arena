import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useVoteStats } from '@/hooks'
import { ErrorMessage, AuthErrorMessage } from '@/components/ErrorMessage'
import { LoadingSpinner, CardSkeleton } from '@/components/LoadingSpinner'
import { ExpandedComments } from '@/components/ExpandedComments'
import { CommentCreation } from '@/components/CommentCreation'
import { FlagDisplay } from '@/components/FlagDisplay'
import { extractFoodIdsFromPairKey } from '@/lib/pair-utils'
import type { VoteStats } from '@/lib/types'
import { isApiError } from '@/lib/types'

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
              <span className="text-sm">
                {stats.foodNamesById?.[foodId] || `Food ${foodId}`}
              </span>
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
              ([nationality, data]) => {
                // Handle special cases for nationality display
                const getNationalityDisplay = (nat: string) => {
                  if (nat === 'unknown') {
                    return (
                      <span className="inline-flex items-center gap-1">
                        <span className="text-base" aria-hidden="true">
                          🌍
                        </span>
                        <span>Not specified</span>
                      </span>
                    )
                  }
                  if (nat === 'Other') {
                    return (
                      <span className="inline-flex items-center gap-1">
                        <span className="text-base" aria-hidden="true">
                          🌐
                        </span>
                        <span>Other</span>
                      </span>
                    )
                  }
                  // For country codes, use FlagDisplay component
                  return <FlagDisplay countryCode={nat} showName size="sm" />
                }

                return (
                  <div key={nationality} className="border rounded-lg p-3">
                    <h5 className="text-sm font-medium mb-2">
                      {getNationalityDisplay(nationality)}
                    </h5>
                    <div className="space-y-1">
                      {Object.entries(data.byFoodId).map(([foodId, count]) => (
                        <div
                          key={foodId}
                          className="flex justify-between text-xs"
                        >
                          <span>
                            {stats.foodNamesById?.[foodId] || `Food ${foodId}`}
                          </span>
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
                )
              },
            )}
          </div>
        </div>
      )}
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

  const handleContinue = () => {
    navigate({ to: '/' })
  }

  // Handle errors with appropriate messages
  if (statsError) {
    if (isApiError(statsError) && statsError.code === 403) {
      return (
        <div className="max-w-2xl mx-auto">
          <ErrorMessage
            error="You need to vote on this comparison before viewing results."
            onRetry={() => navigate({ to: '/' })}
          />
        </div>
      )
    }
    if (isApiError(statsError) && statsError.code === 401) {
      return (
        <div className="max-w-2xl mx-auto">
          <AuthErrorMessage />
        </div>
      )
    }
    return (
      <div className="max-w-2xl mx-auto">
        <ErrorMessage
          error={statsError}
          onRetry={() => navigate({ to: '/' })}
          showDetails={process.env.NODE_ENV === 'development'}
        />
      </div>
    )
  }

  if (statsLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Comparison Results</h1>
          <p className="text-muted-foreground mt-2">Loading results...</p>
        </div>

        <CardSkeleton />
        <CardSkeleton />

        <div className="text-center">
          <LoadingSpinner message="Loading vote statistics..." />
        </div>
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

  // Extract food IDs from pairKey for ExpandedComments
  const { foodId1, foodId2 } = extractFoodIdsFromPairKey(pairKey)

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Comparison Results</h1>
        <p className="text-muted-foreground mt-2">
          See how the community voted on this matchup
        </p>
      </div>

      <VoteStatsDisplay stats={stats} pairKey={pairKey} />

      {/* Comment Creation Section */}
      <CommentCreation
        pairKey={pairKey}
        foodNamesById={stats.foodNamesById}
        userVoteForComment={stats.userVoteForComment}
      />

      {/* Expanded Comments Section */}
      <ExpandedComments
        pairKey={pairKey}
        foodId1={foodId1}
        foodId2={foodId2}
        foodNamesById={stats.foodNamesById}
        currentPairingLimit={10}
        expandedLimit={10}
      />

      <div className="text-center">
        <Button onClick={handleContinue} size="lg">
          Continue to Next Comparison
        </Button>
      </div>
    </div>
  )
}
