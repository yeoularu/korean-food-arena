import * as React from 'react'
import { CountryDropdown } from '@/components/CountryDropdown'

/**
 * Demo component for testing CountryDropdown functionality
 */
export function CountryDropdownDemo() {
  const [selectedCountry, setSelectedCountry] = React.useState<
    string | undefined
  >()
  const [isDisabled, setIsDisabled] = React.useState(false)
  const [showFlags, setShowFlags] = React.useState(true)

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">CountryDropdown Demo</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Country
            </label>
            <CountryDropdown
              value={selectedCountry}
              onChange={setSelectedCountry}
              disabled={isDisabled}
              showFlags={showFlags}
              placeholder="Choose your country"
            />
          </div>

          <div className="text-sm text-muted-foreground">
            Selected: {selectedCountry || 'None'}
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isDisabled}
                onChange={(e) => setIsDisabled(e.target.checked)}
              />
              <span className="text-sm">Disabled</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showFlags}
                onChange={(e) => setShowFlags(e.target.checked)}
              />
              <span className="text-sm">Show Flags</span>
            </label>
          </div>

          <button
            onClick={() => setSelectedCountry(undefined)}
            className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
          >
            Clear Selection
          </button>
        </div>
      </div>
    </div>
  )
}
