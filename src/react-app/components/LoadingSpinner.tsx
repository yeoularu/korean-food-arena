interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  message?: string
}

export function LoadingSpinner({
  size = 'md',
  className = '',
  message,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        className={`animate-spin text-primary ${sizeClasses[size]}`}
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {message && (
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  )
}

// Full page loading component
export function PageLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoadingSpinner size="lg" message={message} />
    </div>
  )
}

// Inline loading component for buttons
export function ButtonLoading({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return <LoadingSpinner size={size} />
}

// Card loading skeleton
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="bg-muted rounded-lg p-4 space-y-3">
        <div className="h-4 bg-muted-foreground/20 rounded w-3/4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-muted-foreground/20 rounded"></div>
          <div className="h-3 bg-muted-foreground/20 rounded w-5/6"></div>
        </div>
      </div>
    </div>
  )
}

// Food card loading skeleton
export function FoodCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-muted rounded-lg overflow-hidden">
        {/* Image skeleton */}
        <div className="h-48 bg-muted-foreground/20"></div>

        {/* Content skeleton */}
        <div className="p-4 space-y-3">
          <div className="h-5 bg-muted-foreground/20 rounded w-3/4"></div>
          <div className="h-4 bg-muted-foreground/20 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  )
}

// Leaderboard loading skeleton
export function LeaderboardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="flex items-center space-x-4 p-4 bg-card rounded-lg border">
            <div className="w-8 h-8 bg-muted-foreground/20 rounded"></div>
            <div className="w-16 h-16 bg-muted-foreground/20 rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted-foreground/20 rounded w-1/3"></div>
              <div className="h-3 bg-muted-foreground/20 rounded w-1/4"></div>
            </div>
            <div className="h-6 bg-muted-foreground/20 rounded w-16"></div>
          </div>
        </div>
      ))}
    </div>
  )
}
