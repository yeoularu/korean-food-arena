import { FlagDisplay } from './FlagDisplay'

/**
 * Demo component to showcase Results nationality breakdown with flags
 * This demonstrates the flag display functionality in nationality breakdown
 */
export function ResultsNationalityDemo() {
  // Mock nationality breakdown data similar to what Results component receives
  const mockNationalityBreakdown = {
    US: {
      byFoodId: { kimchi: 30, bibimbap: 20 },
      tiePercentage: 0,
    },
    KR: {
      byFoodId: { kimchi: 25, bibimbap: 15 },
      tiePercentage: 5.0,
    },
    JP: {
      byFoodId: { kimchi: 12, bibimbap: 8 },
      tiePercentage: 0,
    },
    CN: {
      byFoodId: { kimchi: 8, bibimbap: 12 },
      tiePercentage: 2.5,
    },
    unknown: {
      byFoodId: { kimchi: 5, bibimbap: 3 },
      tiePercentage: 0,
    },
    Other: {
      byFoodId: { kimchi: 7, bibimbap: 4 },
      tiePercentage: 10.0,
    },
  }

  const mockFoodNames = {
    kimchi: 'Kimchi',
    bibimbap: 'Bibimbap',
  }

  // Function to get nationality display (same logic as in Results component)
  const getNationalityDisplay = (nationality: string) => {
    if (nationality === 'unknown') {
      return (
        <span className="inline-flex items-center gap-1">
          <span className="text-base" aria-hidden="true">
            🌍
          </span>
          <span>Not specified</span>
        </span>
      )
    }
    if (nationality === 'Other') {
      return (
        <span className="inline-flex items-center gap-1">
          <span className="text-base" aria-hidden="true">
            🌐
          </span>
          <span>Other</span>
        </span>
      )
    }
    // For country codes, use FlagDisplay component
    return <FlagDisplay countryCode={nationality} showName size="sm" />
  }

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold">Results Nationality Breakdown Demo</h2>
      <p className="text-gray-600">
        This demonstrates how nationality flags are displayed in the Results
        component's nationality breakdown section.
      </p>

      <div className="mt-6">
        <h4 className="text-md font-medium mb-3">Breakdown by Nationality</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Based on current nationality settings. Groups with fewer than 5 users
          are shown as "Other".
        </p>
        <div className="space-y-3">
          {Object.entries(mockNationalityBreakdown).map(
            ([nationality, data]) => (
              <div key={nationality} className="border rounded-lg p-3">
                <h5 className="text-sm font-medium mb-2">
                  {getNationalityDisplay(nationality)}
                </h5>
                <div className="space-y-1">
                  {Object.entries(data.byFoodId).map(([foodId, count]) => (
                    <div key={foodId} className="flex justify-between text-xs">
                      <span>
                        {mockFoodNames[foodId as keyof typeof mockFoodNames] ||
                          `Food ${foodId}`}
                      </span>
                      <span>{count} votes</span>
                    </div>
                  ))}
                  {data.tiePercentage > 0 && (
                    <div className="flex justify-between text-xs">
                      <span>Tie</span>
                      <span>{data.tiePercentage.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Implementation Notes</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>
            • Country codes (US, KR, JP, CN) display with flag emojis and
            country names
          </li>
          <li>
            • "unknown" nationality shows globe emoji with "Not specified" text
          </li>
          <li>
            • "Other" category shows different globe emoji for aggregated small
            groups
          </li>
          <li>• All displays maintain accessibility with proper ARIA labels</li>
          <li>
            • Vote counts and tie percentages are preserved from original data
          </li>
        </ul>
      </div>
    </div>
  )
}
