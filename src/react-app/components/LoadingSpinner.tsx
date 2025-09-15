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

// Comment-specific loading skeletons
export function CommentSkeleton({
  showContext = false,
}: {
  showContext?: boolean
}) {
  return (
    <div className="animate-pulse border rounded-lg p-3 bg-white shadow-sm">
      {/* Header skeleton */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div className="h-3 bg-muted-foreground/20 rounded w-16"></div>
          {showContext && (
            <div className="h-4 bg-blue-100 rounded-full w-20"></div>
          )}
        </div>
        <div className="h-3 bg-muted-foreground/20 rounded w-12"></div>
      </div>

      {/* Content skeleton */}
      <div className="space-y-2 mb-3">
        <div className="h-3 bg-muted-foreground/20 rounded w-full"></div>
        <div className="h-3 bg-muted-foreground/20 rounded w-4/5"></div>
        <div className="h-3 bg-muted-foreground/20 rounded w-3/5"></div>
      </div>

      {/* Footer skeleton */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="h-3 bg-muted-foreground/20 rounded w-10"></div>
          <div className="h-5 bg-green-100 rounded w-16"></div>
        </div>
        {showContext && (
          <div className="h-3 bg-muted-foreground/20 rounded w-24"></div>
        )}
      </div>
    </div>
  )
}

export function CommentsSkeleton({
  count = 3,
  showExpandedSection = true,
}: {
  count?: number
  showExpandedSection?: boolean
}) {
  return (
    <div className="space-y-6" role="region" aria-label="Loading comments">
      {/* Current pairing comments skeleton */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-muted-foreground/20 rounded-full"></div>
          <div className="h-5 bg-muted-foreground/20 rounded w-48"></div>
          <div className="h-4 bg-muted-foreground/20 rounded w-8"></div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: Math.min(count, 2) }).map((_, i) => (
            <CommentSkeleton key={`current-${i}`} showContext={false} />
          ))}
        </div>
      </section>

      {/* Expanded comments skeleton */}
      {showExpandedSection && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-muted-foreground/20 rounded-full"></div>
            <div className="h-5 bg-muted-foreground/20 rounded w-56"></div>
            <div className="h-4 bg-muted-foreground/20 rounded w-8"></div>
          </div>
          <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
              <CommentSkeleton key={`expanded-${i}`} showContext={true} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export function CommentCreationSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-5 bg-muted-foreground/20 rounded w-32"></div>

      {/* Vote options skeleton */}
      <div className="space-y-2">
        <div className="h-3 bg-muted-foreground/20 rounded w-40"></div>
        <div className="flex flex-col sm:flex-row sm:space-x-6 space-y-2 sm:space-y-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-muted-foreground/20 rounded-full"></div>
              <div className="h-3 bg-muted-foreground/20 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Textarea skeleton */}
      <div className="h-20 bg-muted-foreground/20 rounded"></div>

      {/* Footer skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-3 bg-muted-foreground/20 rounded w-20"></div>
        <div className="h-8 bg-muted-foreground/20 rounded w-24"></div>
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
