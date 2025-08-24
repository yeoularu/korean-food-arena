import { useEffect } from 'react'
import { useSession, useSignInAnonymous } from '@/hooks/use-session'

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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  // Show error state if session creation failed
  if (signInAnonymous.isError && !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">
            Failed to create session. Please refresh the page.
          </p>
          <button
            onClick={() => signInAnonymous.mutate()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
