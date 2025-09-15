import * as React from 'react'
import { getCountryFlag, getCountryName } from '@/lib/nationality'
import { cn } from '@/lib/utils'

export interface FlagDisplayProps {
  /**
   * ISO 3166-1 alpha-2 country code or 'unknown'
   */
  countryCode?: string
  /**
   * Whether to show the country name alongside the flag
   */
  showName?: boolean
  /**
   * Size variant for the flag display
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Additional CSS classes
   */
  className?: string
  /**
   * Whether to lazy load the flag (for performance)
   */
  lazy?: boolean
}

// Size classes for flag emoji - memoized for performance
const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
} as const

// Size classes for text when showing name - memoized for performance
const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
} as const

/**
 * FlagDisplay component for displaying country flags with optional names
 *
 * Features:
 * - Displays Unicode flag emojis for country codes
 * - Handles fallback cases for missing or invalid country codes
 * - Supports different sizes (sm, md, lg) for various use cases
 * - Includes proper accessibility attributes and ARIA labels
 * - Optional country name display
 * - Performance optimized with memoization and lazy loading
 */
export const FlagDisplay = React.memo<FlagDisplayProps>(function FlagDisplay({
  countryCode,
  showName = false,
  size = 'md',
  className,
  lazy = false,
}) {
  // Memoize flag and country name to avoid recalculation
  const flag = React.useMemo(() => getCountryFlag(countryCode), [countryCode])
  const countryName = React.useMemo(
    () => getCountryName(countryCode),
    [countryCode],
  )

  // Lazy loading state for performance on mobile
  const [isVisible, setIsVisible] = React.useState(!lazy)
  const flagRef = React.useRef<HTMLSpanElement>(null)

  // Intersection observer for lazy loading
  React.useEffect(() => {
    if (!lazy || isVisible) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 },
    )

    if (flagRef.current) {
      observer.observe(flagRef.current)
    }

    return () => observer.disconnect()
  }, [lazy, isVisible])

  return (
    <span
      ref={flagRef}
      className={cn('inline-flex items-center gap-1', className)}
      role="img"
      aria-label={`Flag of ${countryName}`}
    >
      <span
        className={cn('inline-block', sizeClasses[size])}
        aria-hidden="true"
        style={{
          // Optimize rendering on mobile devices
          willChange: lazy ? 'auto' : undefined,
          transform: 'translateZ(0)', // Force hardware acceleration
        }}
      >
        {isVisible ? flag : '⏳'}
      </span>
      {showName && (
        <span className={cn('text-foreground', textSizeClasses[size])}>
          {countryName}
        </span>
      )}
    </span>
  )
})
