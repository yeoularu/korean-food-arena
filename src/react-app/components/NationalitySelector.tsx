import * as React from 'react'
import { CountryDropdown } from '@/components/CountryDropdown'
import { FlagDisplay } from '@/components/FlagDisplay'
import { useSession, useUpdateNationality } from '@/hooks/use-session'
import { cn } from '@/lib/utils'

export interface NationalitySelectorProps {
  /**
   * Current nationality override (if not using session data)
   */
  currentNationality?: string
  /**
   * Callback when nationality selection changes
   */
  onNationalityChange?: (nationality: string | undefined) => void
  /**
   * Callback when nationality update fails
   */
  onError?: (error: unknown) => void
  /**
   * Whether the selector is disabled
   */
  disabled?: boolean
  /**
   * Whether to show the nationality label
   */
  showLabel?: boolean
  /**
   * Whether to use compact mode (for comment creation)
   */
  compact?: boolean
  /**
   * Additional CSS classes for the container
   */
  className?: string
}

/**
 * NationalitySelector component that combines dropdown and current nationality display
 *
 * Features:
 * - Combines CountryDropdown and FlagDisplay components
 * - Supports both compact (comment creation) and full (profile) modes
 * - Handles nationality change events and state management
 * - Integrates with existing session management hooks
 * - Automatically updates user nationality in session
 * - Performance optimized with proper loading states and memoization
 */
export const NationalitySelector = React.memo<NationalitySelectorProps>(
  function NationalitySelector({
    currentNationality,
    onNationalityChange,
    onError,
    disabled = false,
    showLabel = true,
    compact = false,
    className,
  }) {
    const { data: session } = useSession()
    const updateNationalityMutation = useUpdateNationality()
    const [isUpdating, setIsUpdating] = React.useState(false)

    // Use provided nationality or fall back to session nationality
    // Convert null to undefined for CountryDropdown compatibility
    const nationality = React.useMemo(
      () => currentNationality ?? session?.user?.nationality ?? undefined,
      [currentNationality, session?.user?.nationality],
    )

    // Handle nationality changes with proper loading state
    const handleNationalityChange = React.useCallback(
      async (newNationality: string | undefined) => {
        if (isUpdating) return // Prevent concurrent updates

        setIsUpdating(true)
        try {
          // Update nationality in the backend/session
          await updateNationalityMutation.mutateAsync(newNationality)

          // Call the optional callback after successful update
          onNationalityChange?.(newNationality)
        } catch (error) {
          console.error('Failed to update nationality:', error)
          // Call the error callback if provided (for compact mode)
          onError?.(error)
          // Error is also handled by the mutation's isError state
          // The UI will show the error message automatically in full mode
        } finally {
          setIsUpdating(false)
        }
      },
      [updateNationalityMutation, onNationalityChange, onError, isUpdating],
    )

    // Combined loading state for better UX
    const isLoading = React.useMemo(
      () => updateNationalityMutation.isPending || isUpdating,
      [updateNationalityMutation.isPending, isUpdating],
    )

    // Compact mode for comment creation with enhanced loading states
    if (compact) {
      return (
        <div className={cn('flex items-center gap-2', className)}>
          {showLabel && (
            <label className="text-sm font-medium text-foreground">
              Nationality:
            </label>
          )}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {nationality && !isLoading && (
              <FlagDisplay
                countryCode={nationality}
                size="sm"
                className="shrink-0"
                lazy={true} // Enable lazy loading for performance
              />
            )}
            {isLoading && (
              <div className="shrink-0 w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
            <CountryDropdown
              value={nationality}
              onChange={handleNationalityChange}
              disabled={disabled || isLoading}
              placeholder={
                isLoading
                  ? 'Updating...'
                  : nationality
                    ? 'Change nationality'
                    : 'Select nationality'
              }
              className={cn(
                'min-w-0 flex-1 transition-opacity duration-200',
                isLoading && 'opacity-75',
              )}
            />
          </div>
        </div>
      )
    }

    // Full mode for profile page with enhanced loading states
    return (
      <div className={cn('space-y-3', className)}>
        {showLabel && (
          <label className="text-sm font-medium text-foreground">
            Nationality
          </label>
        )}

        {/* Current nationality display with loading state */}
        {nationality && (
          <div
            className={cn(
              'flex items-center gap-3 p-3 rounded-md border bg-muted/50 transition-opacity duration-200',
              isLoading && 'opacity-75',
            )}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">
                  Updating...
                </span>
              </div>
            ) : (
              <FlagDisplay
                countryCode={nationality}
                showName
                size="md"
                lazy={true} // Enable lazy loading for performance
              />
            )}
          </div>
        )}

        {/* Nationality selection dropdown */}
        <div className="space-y-2">
          <CountryDropdown
            value={nationality}
            onChange={handleNationalityChange}
            disabled={disabled || isLoading}
            placeholder="Select your nationality"
            className={cn(
              'w-full transition-opacity duration-200',
              isLoading && 'opacity-75',
            )}
          />

          {/* Enhanced loading state */}
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-3 h-3 animate-spin rounded-full border border-current border-t-transparent" />
              <span>Updating nationality...</span>
            </div>
          )}

          {/* Error state */}
          {updateNationalityMutation.isError && !isLoading && (
            <p className="text-xs text-destructive">
              Failed to update nationality. Please try again.
            </p>
          )}

          {/* Success state */}
          {updateNationalityMutation.isSuccess && !isLoading && (
            <p className="text-xs text-green-600 dark:text-green-400">
              Nationality updated successfully!
            </p>
          )}

          {/* Help text */}
          <p className="text-xs text-muted-foreground">
            Your nationality is used for demographic analytics and is optional.
            It will be displayed with your comments.
          </p>
        </div>
      </div>
    )
  },
)
