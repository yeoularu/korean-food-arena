import * as React from 'react'
import { NationalitySelector } from '@/components/NationalitySelector'

/**
 * Demo component to showcase NationalitySelector functionality
 * This demonstrates both compact and full modes with different configurations
 */
export function NationalitySelectorDemo() {
  const [selectedNationality, setSelectedNationality] = React.useState<
    string | undefined
  >('US')

  const handleNationalityChange = React.useCallback(
    (nationality: string | undefined) => {
      setSelectedNationality(nationality)
      console.log('Nationality changed to:', nationality)
    },
    [],
  )

  return (
    <div className="space-y-8 p-6 max-w-2xl mx-auto">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">NationalitySelector Demo</h2>
        <p className="text-muted-foreground">
          This demo showcases the NationalitySelector component in different
          modes and configurations.
        </p>
      </div>

      {/* Compact Mode Examples */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          Compact Mode (for Comment Creation)
        </h3>

        <div className="space-y-3 p-4 border rounded-lg">
          <h4 className="font-medium">With Label and Current Nationality</h4>
          <NationalitySelector
            compact={true}
            showLabel={true}
            currentNationality={selectedNationality}
            onNationalityChange={handleNationalityChange}
          />
        </div>

        <div className="space-y-3 p-4 border rounded-lg">
          <h4 className="font-medium">Without Label</h4>
          <NationalitySelector
            compact={true}
            showLabel={false}
            currentNationality={selectedNationality}
            onNationalityChange={handleNationalityChange}
          />
        </div>

        <div className="space-y-3 p-4 border rounded-lg">
          <h4 className="font-medium">No Current Nationality</h4>
          <NationalitySelector
            compact={true}
            showLabel={true}
            currentNationality={undefined}
            onNationalityChange={handleNationalityChange}
          />
        </div>

        <div className="space-y-3 p-4 border rounded-lg">
          <h4 className="font-medium">Disabled State</h4>
          <NationalitySelector
            compact={true}
            showLabel={true}
            currentNationality={selectedNationality}
            onNationalityChange={handleNationalityChange}
            disabled={true}
          />
        </div>
      </div>

      {/* Full Mode Examples */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Full Mode (for Profile Page)</h3>

        <div className="space-y-3 p-4 border rounded-lg">
          <h4 className="font-medium">With Label and Current Nationality</h4>
          <NationalitySelector
            compact={false}
            showLabel={true}
            currentNationality={selectedNationality}
            onNationalityChange={handleNationalityChange}
          />
        </div>

        <div className="space-y-3 p-4 border rounded-lg">
          <h4 className="font-medium">Without Label</h4>
          <NationalitySelector
            compact={false}
            showLabel={false}
            currentNationality={selectedNationality}
            onNationalityChange={handleNationalityChange}
          />
        </div>

        <div className="space-y-3 p-4 border rounded-lg">
          <h4 className="font-medium">No Current Nationality</h4>
          <NationalitySelector
            compact={false}
            showLabel={true}
            currentNationality={undefined}
            onNationalityChange={handleNationalityChange}
          />
        </div>
      </div>

      {/* Current State Display */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Current State</h3>
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm">
            <strong>Selected Nationality:</strong>{' '}
            {selectedNationality ? selectedNationality : 'None'}
          </p>
        </div>
      </div>

      {/* Usage Examples */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Usage Examples</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Comment Creation:</strong> Use compact mode with label
          </p>
          <p>
            <strong>Profile Page:</strong> Use full mode with label and help
            text
          </p>
          <p>
            <strong>Settings:</strong> Use full mode without label in a form
            context
          </p>
        </div>
      </div>
    </div>
  )
}
