import { useEffect, useState } from 'react'
import { authClient } from '@/lib/auth-client'

interface EnsureSessionProps {
  children: React.ReactNode
}

export function EnsureSession({ children }: EnsureSessionProps) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const sessionData = await authClient.getSession()
        if (!sessionData.data) {
          // Create anonymous session if none exists
          await authClient.signIn.anonymous()
        }
      } catch (error) {
        console.error('Session check failed:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  return <>{children}</>
}
