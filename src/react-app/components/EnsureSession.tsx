import { useEffect } from 'react'
import { useSession, useSignInAnonymous } from '@/hooks/use-session'
import { ErrorMessage } from '@/components/ErrorMessage'
import { PageLoading } from '@/components/LoadingSpinner'

interface EnsureSessionProps {
  children: React.ReactNode
}

export function EnsureSession({ children }: EnsureSessionProps) {
  const { data: session, isLoading, error } = useSession()
  const signInAnonymous = useSignInAnonymous()

  useEffect(() => {
    // If we have no session and we're not already trying to create one, create anonymous session
    if (!isLoading && !session && !signInAnonymous.isPending && !error) {
      signInAnonymous.mutate()
    }
  }, [session, isLoading, signInAnonymous, error])

  // Show loading while checking session or creating anonymous session
  if (isLoading || (!session && signInAnonymous.isPending)) {
    return <PageLoading message="Setting up your session..." />
  }

  // Show error state if session creation failed
  if (signInAnonymous.isError && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full mx-4">
          <ErrorMessage
            error={
              signInAnonymous.error ||
              'Failed to create session. Please refresh the page.'
            }
            onRetry={() => signInAnonymous.mutate()}
            showDetails={process.env.NODE_ENV === 'development'}
          />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
