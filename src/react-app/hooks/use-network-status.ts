import { useState, useEffect } from 'react'
import { useInfoToast, useWarningToast } from '@/components/Toast'

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [wasOffline, setWasOffline] = useState(false)
  const showInfo = useInfoToast()
  const showWarning = useWarningToast()

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (wasOffline) {
        showInfo(
          'Connection restored! You can continue using the app.',
          'Back Online',
        )
        setWasOffline(false)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
      showWarning(
        'You are currently offline. Some features may not work properly.',
        'Connection Lost',
      )
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasOffline, showInfo, showWarning])

  return {
    isOnline,
    wasOffline,
  }
}

// Hook for components that need to react to network status
export function useNetworkAwareQuery() {
  const { isOnline } = useNetworkStatus()

  return {
    enabled: isOnline,
    retry: (failureCount: number) => {
      // Don't retry if offline
      if (!isOnline) return false

      // Standard retry logic when online
      return failureCount < 3
    },
    retryDelay: (attemptIndex: number) => {
      // Exponential backoff with jitter
      const baseDelay = Math.min(1000 * 2 ** attemptIndex, 30000)
      const jitter = Math.random() * 1000
      return baseDelay + jitter
    },
  }
}
