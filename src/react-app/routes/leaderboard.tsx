import { createFileRoute, ErrorComponent } from '@tanstack/react-router'
import { Leaderboard } from '@/components/Leaderboard'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const Route = createFileRoute('/leaderboard')({
  component: LeaderboardPage,
  errorComponent: ({ error }) => (
    <div className="text-center space-y-4">
      <h2 className="text-2xl font-bold">Unable to Load Leaderboard</h2>
      <p className="text-muted-foreground">
        Failed to load leaderboard. Please refresh the page or try again later.
      </p>
      <ErrorComponent error={error} />
    </div>
  ),
})

function LeaderboardPage() {
  return (
    <ErrorBoundary
      fallback={
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Unable to Load Leaderboard</h2>
          <p className="text-muted-foreground">
            There was an error loading the food rankings.
          </p>
        </div>
      }
    >
      <Leaderboard />
    </ErrorBoundary>
  )
}
