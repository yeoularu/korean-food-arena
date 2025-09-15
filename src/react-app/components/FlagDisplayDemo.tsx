import { FlagDisplay } from './FlagDisplay'

/**
 * Demo component to showcase FlagDisplay functionality
 * This can be used for visual testing and development
 */
export function FlagDisplayDemo() {
  const testCases = [
    { code: 'US', label: 'United States' },
    { code: 'KR', label: 'South Korea' },
    { code: 'JP', label: 'Japan' },
    { code: 'CN', label: 'China' },
    { code: 'GB', label: 'United Kingdom' },
    { code: 'unknown', label: 'Prefer not to say' },
    { code: 'XX', label: 'Invalid code' },
    { code: undefined, label: 'Undefined code' },
  ]

  const sizes = ['sm', 'md', 'lg'] as const

  return (
    <div className="p-6 space-y-8">
      <h2 className="text-2xl font-bold">FlagDisplay Component Demo</h2>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Usage (Flag Only)</h3>
        <div className="flex flex-wrap gap-4">
          {testCases.map((test, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 border rounded"
            >
              <FlagDisplay countryCode={test.code} />
              <span className="text-sm text-gray-600">{test.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">With Country Names</h3>
        <div className="flex flex-wrap gap-4">
          {testCases.map((test, index) => (
            <div key={index} className="p-2 border rounded">
              <FlagDisplay countryCode={test.code} showName />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Size Variants</h3>
        {sizes.map((size) => (
          <div key={size} className="space-y-2">
            <h4 className="font-medium">Size: {size}</h4>
            <div className="flex flex-wrap gap-4">
              <FlagDisplay countryCode="US" size={size} />
              <FlagDisplay countryCode="KR" size={size} showName />
              <FlagDisplay countryCode="JP" size={size} showName />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Custom Styling</h3>
        <div className="flex flex-wrap gap-4">
          <FlagDisplay
            countryCode="US"
            showName
            className="p-2 bg-blue-50 border border-blue-200 rounded"
          />
          <FlagDisplay
            countryCode="KR"
            showName
            size="lg"
            className="p-3 bg-green-50 border border-green-200 rounded-lg"
          />
        </div>
      </div>
    </div>
  )
}
