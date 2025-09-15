import { useNetworkStatus } from '@/hooks/use-network-status'

interface OfflineIndicatorProps {
  context?: 'general' | 'comments' | 'voting'
  className?: string
}

export function OfflineIndicator({
  context = 'general',
  className = '',
}: OfflineIndicatorProps) {
  const { isOnline } = useNetworkStatus()

  if (isOnline) return null

  const getContextualMessage = () => {
    switch (context) {
      case 'comments':
        return 'You are offline. Comments cannot be loaded or posted until connection is restored.'
      case 'voting':
        return 'You are offline. Voting and results are not available until connection is restored.'
      default:
        return 'You are currently offline. Some features may not work properly.'
    }
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground px-4 py-2 text-center text-sm ${className}`}
    >
      <div className="flex items-center justify-center space-x-2">
        <svg
          className="w-4 h-4 animate-pulse"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <span role="alert" aria-live="polite">
          {getContextualMessage()}
        </span>
      </div>
    </div>
  )
}

// Inline offline indicator for specific components
export function InlineOfflineIndicator({
  message = 'This feature requires an internet connection',
  className = '',
}: {
  message?: string
  className?: string
}) {
  const { isOnline } = useNetworkStatus()

  if (isOnline) return null

  return (
    <div
      className={`rounded-lg border border-destructive/20 bg-destructive/5 p-3 ${className}`}
    >
      <div className="flex items-center space-x-2 text-sm text-destructive">
        <svg
          className="w-4 h-4 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <span role="alert" aria-live="polite">
          {message}
        </span>
      </div>
    </div>
  )
}
