import { useState, useEffect } from 'react'
import { useSession, useUpdateNationality } from '@/hooks/use-session'
import { Button } from '@/components/ui/button'
import { NationalityDisclaimer } from './NationalityDisclaimer'

// ISO 3166-1 alpha-2 country codes for common countries
const COUNTRY_OPTIONS = [
  { code: 'unknown', name: 'Prefer not to say' },
  { code: 'KR', name: 'South Korea' },
  { code: 'US', name: 'United States' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'IN', name: 'India' },
  { code: 'TH', name: 'Thailand' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'PH', name: 'Philippines' },
  { code: 'SG', name: 'Singapore' },
  { code: 'MY', name: 'Malaysia' },
]

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
        <select
          id="nationality"
          value={selectedNationality || currentNationality}
          onChange={(e) => setSelectedNationality(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        >
          {COUNTRY_OPTIONS.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          This information is used for analytics and will be shown as "Other" if
          fewer than 5 users share the same nationality.
        </p>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <strong>Current nationality:</strong>{' '}
          {COUNTRY_OPTIONS.find((c) => c.code === currentNationality)?.name ||
            'Unknown'}
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
