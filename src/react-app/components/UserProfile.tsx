import { useState, useEffect } from 'react'
import { useSession, useUpdateNationality } from '@/hooks/use-session'
import { Button } from '@/components/ui/button'
import { NationalityDisclaimer } from './NationalityDisclaimer'
import { CountryDropdown } from './CountryDropdown'
import { FlagDisplay } from './FlagDisplay'

export function UserProfile() {
  const { data: session, isLoading } = useSession()
  const updateNationality = useUpdateNationality()
  const [selectedNationality, setSelectedNationality] = useState<string>('')

  // Initialize selected nationality when session loads
  useEffect(() => {
    if (session?.user?.nationality) {
      setSelectedNationality(session.user.nationality)
    }
  }, [session?.user?.nationality])

  const handleUpdateNationality = async () => {
    try {
      await updateNationality.mutateAsync(
        selectedNationality === 'unknown' ? undefined : selectedNationality,
      )
    } catch (error) {
      console.error('Failed to update nationality:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600 dark:text-gray-400">
          Please refresh the page to load your profile.
        </p>
      </div>
    )
  }

  const currentNationality = session.user.nationality || 'unknown'
  const hasChanges = selectedNationality !== currentNationality

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Profile Settings</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your nationality helps us provide demographic insights while keeping
          your identity anonymous.
        </p>
      </div>

      <div className="mb-6">
        <label htmlFor="nationality" className="block text-sm font-medium mb-2">
          Nationality (Optional)
        </label>
        <CountryDropdown
          value={selectedNationality || currentNationality}
          onChange={(value) => setSelectedNationality(value || 'unknown')}
          disabled={updateNationality.isPending}
          placeholder="Select your nationality"
          showFlags={true}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          This information is used for analytics and will be shown as "Other" if
          fewer than 5 users share the same nationality.
        </p>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
          <strong>Current nationality:</strong>
          <FlagDisplay
            countryCode={currentNationality}
            showName={true}
            size="sm"
          />
        </p>
      </div>

      <Button
        onClick={handleUpdateNationality}
        disabled={!hasChanges || updateNationality.isPending}
        className="w-full"
      >
        {updateNationality.isPending ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Updating...
          </>
        ) : (
          'Update Nationality'
        )}
      </Button>

      {updateNationality.isError && (
        <p className="text-red-600 dark:text-red-400 text-sm mt-2">
          Failed to update nationality. Please try again.
        </p>
      )}

      {updateNationality.isSuccess && (
        <p className="text-green-600 dark:text-green-400 text-sm mt-2">
          Nationality updated successfully!
        </p>
      )}

      <div className="mt-6">
        <NationalityDisclaimer />
      </div>
    </div>
  )
}
