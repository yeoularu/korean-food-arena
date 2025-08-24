import { createFileRoute, ErrorComponent } from '@tanstack/react-router'
import { UserProfile } from '@/components/UserProfile'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
  errorComponent: ({ error }) => (
    <div className="text-center space-y-4">
      <h2 className="text-2xl font-bold">Unable to Load Profile</h2>
      <p className="text-muted-foreground">
        Failed to load user profile. Please refresh the page or try again later.
      </p>
      <ErrorComponent error={error} />
    </div>
  ),
})

function ProfilePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">User Profile</h1>
      <ErrorBoundary
        fallback={
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold">Unable to Load Profile</h2>
            <p className="text-muted-foreground">
              There was an error loading your profile settings.
            </p>
          </div>
        }
      >
        <UserProfile />
      </ErrorBoundary>
    </div>
  )
}
