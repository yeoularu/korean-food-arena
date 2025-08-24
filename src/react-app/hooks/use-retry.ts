import { useState, useCallback } from 'react'

interface UseRetryOptions {
  maxRetries?: number
  retryDelay?: number
  backoffMultiplier?: number
}

interface RetryState {
  retryCount: number
  isRetrying: boolean
  lastError: Error | null
}

export function useRetry(options: UseRetryOptions = {}) {
  const { maxRetries = 3, retryDelay = 1000, backoffMultiplier = 2 } = options

  const [retryState, setRetryState] = useState<RetryState>({
    retryCount: 0,
    isRetrying: false,
    lastError: null,
  })

  const executeWithRetry = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T> => {
      let currentRetry = 0
      let currentDelay = retryDelay

      while (currentRetry <= maxRetries) {
        try {
          setRetryState((prev) => ({
            ...prev,
            isRetrying: currentRetry > 0,
            retryCount: currentRetry,
          }))

          const result = await operation()

          // Reset state on success
          setRetryState({
            retryCount: 0,
            isRetrying: false,
            lastError: null,
          })

          return result
        } catch (error) {
          const errorObj =
            error instanceof Error ? error : new Error(String(error))

          setRetryState((prev) => ({
            ...prev,
            lastError: errorObj,
            retryCount: currentRetry,
          }))

          // If we've exhausted retries, throw the error
          if (currentRetry >= maxRetries) {
            setRetryState((prev) => ({ ...prev, isRetrying: false }))
            throw errorObj
          }

          // Wait before retrying (with exponential backoff)
          if (currentRetry < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, currentDelay))
            currentDelay *= backoffMultiplier
          }

          currentRetry++
        }
      }

      // This should never be reached, but TypeScript requires it
      throw new Error('Max retries exceeded')
    },
    [maxRetries, retryDelay, backoffMultiplier],
  )

  const reset = useCallback(() => {
    setRetryState({
      retryCount: 0,
      isRetrying: false,
      lastError: null,
    })
  }, [])

  return {
    executeWithRetry,
    reset,
    ...retryState,
    canRetry: retryState.retryCount < maxRetries,
  }
}

// Hook for manual retry functionality
export function useManualRetry() {
  const [retryKey, setRetryKey] = useState(0)

  const retry = useCallback(() => {
    setRetryKey((prev) => prev + 1)
  }, [])

  return { retryKey, retry }
}

// Hook for network-aware retry
export function useNetworkRetry(options: UseRetryOptions = {}) {
  const retry = useRetry(options)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // Listen for network status changes
  useState(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  })

  const executeWithNetworkRetry = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T> => {
      if (!isOnline) {
        throw new Error(
          'No internet connection. Please check your network and try again.',
        )
      }

      return retry.executeWithRetry(operation)
    },
    [isOnline, retry],
  )

  return {
    ...retry,
    executeWithRetry: executeWithNetworkRetry,
    isOnline,
  }
}
