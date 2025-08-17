import { ModeToggle } from '@/components/mode-toggle'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div>
      <h3>Welcome Home!</h3>
      <ModeToggle />
      <p>{JSON.stringify(import.meta.env, null, 2)}</p>
    </div>
  )
}
