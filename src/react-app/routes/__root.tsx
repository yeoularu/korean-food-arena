import {
  Outlet,
  createRootRouteWithContext,
  ErrorComponent,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { Navigation } from '@/components/Navigation'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { useNetworkStatus } from '@/hooks/use-network-status'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <ErrorComponent error={error} />
      </main>
    </div>
  ),
})

function RootComponent() {
  // Initialize network status monitoring
  useNetworkStatus()

  return (
    <div className="min-h-screen bg-background">
      <OfflineIndicator />
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}
