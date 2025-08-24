import { createFileRoute, ErrorComponent } from '@tanstack/react-router'
import { FoodComparison } from '@/components/FoodComparison'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const Route = createFileRoute('/')({
  component: Index,
  errorComponent: ({ error }) => (
    <div className="text-center space-y-4">
      <h2 className="text-2xl font-bold">Unable to Load Food Comparison</h2>
      <p className="text-muted-foreground">
        Failed to load food comparison. Please refresh the page or try again
        later.
      </p>
      <ErrorComponent error={error} />
    </div>
  ),
})

function Index() {
  return (
    <ErrorBoundary
      fallback={
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Unable to Load Food Comparison</h2>
          <p className="text-muted-foreground">
            There was an error loading the food comparison interface.
          </p>
        </div>
      }
    >
      <FoodComparison />
    </ErrorBoundary>
  )
}
