export function NationalityDisclaimer() {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm">
      <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
        About Nationality Analytics
      </h4>
      <ul className="text-blue-800 dark:text-blue-200 space-y-1">
        <li>• Nationality information is completely optional and anonymous</li>
        <li>
          • Analytics show current nationality settings, not historical
          snapshots
        </li>
        <li>
          • If you change your nationality, it will affect all your past vote
          statistics
        </li>
        <li>
          • Groups with fewer than 5 users are aggregated as "Other" for privacy
        </li>
        <li>
          • Individual votes and comments remain anonymous regardless of
          nationality
        </li>
      </ul>
    </div>
  )
}
