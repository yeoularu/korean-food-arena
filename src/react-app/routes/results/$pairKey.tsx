import { createFileRoute } from '@tanstack/react-router'
import { Results } from '@/components/Results'

export const Route = createFileRoute('/results/$pairKey')({
  component: ResultsPage,
})

function ResultsPage() {
  const { pairKey } = Route.useParams()
  return <Results pairKey={pairKey} />
}
