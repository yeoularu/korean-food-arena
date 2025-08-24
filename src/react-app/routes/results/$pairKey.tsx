import { createFileRoute, ErrorComponent } from '@tanstack/react-router'
import { Results } from '@/components/Results'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const Route = createFileRoute('/results/$pairKey')({
  component: ResultsPage,
  errorComponent: ({ error }) => (
    <div className="text-center space-y-4">
      <h2 className="text-2xl font-bold">Unable to Load Results</h2>
      <p className="text-muted-foreground">
        Failed to load results page. Please try again or go back to voting.
      </p>
      <ErrorComponent error={error} />
    </div>
  ),
  beforeLoad: ({ params }) => {
    // Validate pairKey format (should be foodId1_foodId2)
    if (!params.pairKey || !params.pairKey.includes('_')) {
      throw new Error('Invalid pair key format')
    }
  },
})

function ResultsPage() {
  const { pairKey } = Route.useParams()

  return (
    <ErrorBoundary
      fallback={
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Unable to Load Results</h2>
          <p className="text-muted-foreground">
            There was an error loading the results for this comparison.
          </p>
        </div>
      }
    >
      <Results pairKey={pairKey} />
    </ErrorBoundary>
  )
}
