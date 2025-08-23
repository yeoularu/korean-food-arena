import { createFileRoute } from '@tanstack/react-router'
import { FoodComparison } from '@/components/FoodComparison'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return <FoodComparison />
}
