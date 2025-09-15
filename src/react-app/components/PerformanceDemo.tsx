import * as React from 'react'
import { FlagDisplay } from './FlagDisplay'
import { CountryDropdown } from './CountryDropdown'
import { NationalitySelector } from './NationalitySelector'
import { COUNTRIES } from '@/lib/nationality'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock session hooks for demo
const mockSessionHooks = {
  useSession: () => ({
    data: { user: { nationality: 'US' } },
    isLoading: false,
  }),
  useUpdateNationality: () => ({
    mutateAsync: async (nationality: string | undefined) => {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500))
      console.log('Updated nationality to:', nationality)
    },
    isPending: false,
    isError: false,
    isSuccess: false,
  }),
}

// Mock the hooks
vi.mock('@/hooks/use-session', () => mockSessionHooks)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

/**
 * Performance Demo Component
 *
 * Demonstrates the performance optimizations implemented:
 * 1. Lazy loading of flag emojis
 * 2. Virtual scrolling in country dropdown
 * 3. Memoized components and calculations
 * 4. Proper loading states
 * 5. Mobile-optimized rendering
 */
export function PerformanceDemo() {
  const [selectedCountry, setSelectedCountry] = React.useState<string>('US')
  const [showManyFlags, setShowManyFlags] = React.useState(false)
  const [performanceMetrics, setPerformanceMetrics] = React.useState<{
    renderTime: number
    flagCount: number
  }>({ renderTime: 0, flagCount: 0 })

  // Measure rendering performance
  const measurePerformance = React.useCallback(() => {
    const startTime = performance.now()
    setShowManyFlags(true)

    // Use requestAnimationFrame to measure after render
    requestAnimationFrame(() => {
      const endTime = performance.now()
      setPerformanceMetrics({
        renderTime: endTime - startTime,
        flagCount: COUNTRIES.length,
      })
    })
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">
            Performance Optimization Demo
          </h1>
          <p className="text-muted-foreground">
            Showcasing performance improvements for nationality selection
            components
          </p>
        </div>

        {/* Performance Metrics */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Performance Metrics</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Last Render Time:</span>
              <span className="ml-2">
                {performanceMetrics.renderTime.toFixed(2)}ms
              </span>
            </div>
            <div>
              <span className="font-medium">Flags Rendered:</span>
              <span className="ml-2">{performanceMetrics.flagCount}</span>
            </div>
          </div>
        </div>

        {/* Optimized FlagDisplay */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">1. Optimized Flag Display</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Regular Flag (Immediate)</h3>
              <FlagDisplay countryCode="US" showName size="lg" />
            </div>
            <div>
              <h3 className="font-medium mb-2">Lazy-Loaded Flag</h3>
              <FlagDisplay countryCode="KR" showName size="lg" lazy />
            </div>
          </div>
        </div>

        {/* Virtual Scrolling Dropdown */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            2. Virtual Scrolling Dropdown
          </h2>
          <p className="text-sm text-muted-foreground">
            Only renders visible items for better performance with large lists
          </p>
          <CountryDropdown
            value={selectedCountry}
            onChange={(value) => setSelectedCountry(value || 'unknown')}
            placeholder="Select a country (virtual scrolling enabled)"
          />
        </div>

        {/* Enhanced Nationality Selector */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            3. Enhanced Nationality Selector
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">
                Compact Mode (Comment Creation)
              </h3>
              <NationalitySelector compact showLabel />
            </div>
            <div>
              <h3 className="font-medium mb-2">Full Mode (Profile)</h3>
              <NationalitySelector compact={false} showLabel />
            </div>
          </div>
        </div>

        {/* Performance Test */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">4. Performance Test</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={measurePerformance}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Render All Flags ({COUNTRIES.length} flags)
            </button>
            <button
              onClick={() => setShowManyFlags(false)}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
            >
              Clear Flags
            </button>
          </div>

          {showManyFlags && (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-96 overflow-y-auto">
              {COUNTRIES.map((country) => (
                <div
                  key={country.code}
                  className="text-center p-2 border rounded"
                >
                  <FlagDisplay
                    countryCode={country.code}
                    size="sm"
                    lazy={true} // Lazy load for performance
                  />
                  <div className="text-xs mt-1 truncate">{country.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile Optimizations */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">5. Mobile Optimizations</h2>
          <div className="bg-muted/50 rounded-lg p-4">
            <ul className="space-y-2 text-sm">
              <li>✅ Hardware acceleration for flag rendering</li>
              <li>
                ✅ Touch-optimized scrolling (-webkit-overflow-scrolling: touch)
              </li>
              <li>✅ Lazy loading to reduce initial render time</li>
              <li>✅ Virtual scrolling for large lists</li>
              <li>✅ Memoized components to prevent unnecessary re-renders</li>
              <li>✅ Optimized search with caching</li>
            </ul>
          </div>
        </div>

        {/* Technical Details */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Technical Implementation</h2>
          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            <h3 className="font-medium mb-2">Key Optimizations:</h3>
            <ul className="space-y-1 list-disc list-inside">
              <li>
                <strong>React.memo:</strong> Prevents unnecessary re-renders of
                components
              </li>
              <li>
                <strong>useMemo:</strong> Caches expensive calculations like
                country lookups
              </li>
              <li>
                <strong>Virtual Scrolling:</strong> Only renders visible
                dropdown items
              </li>
              <li>
                <strong>Intersection Observer:</strong> Lazy loads flags when
                they come into view
              </li>
              <li>
                <strong>Map/Set Lookups:</strong> O(1) country code validation
                and retrieval
              </li>
              <li>
                <strong>Search Caching:</strong> Caches search results to avoid
                repeated filtering
              </li>
              <li>
                <strong>Hardware Acceleration:</strong> CSS transforms for
                smooth flag rendering
              </li>
            </ul>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  )
}
