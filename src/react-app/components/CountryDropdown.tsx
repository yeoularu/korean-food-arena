import * as React from 'react'
import { ChevronDownIcon, SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FlagDisplay } from '@/components/FlagDisplay'
import { COUNTRIES, searchCountries, type Country } from '@/lib/nationality'
import { cn } from '@/lib/utils'

// Virtual scrolling constants for performance
const ITEM_HEIGHT = 40 // Height of each dropdown item in pixels
const VISIBLE_ITEMS = 8 // Number of items visible at once
const BUFFER_SIZE = 3 // Extra items to render for smooth scrolling

export interface CountryDropdownProps {
  /**
   * Currently selected country code
   */
  value?: string
  /**
   * Callback when country selection changes
   */
  onChange: (value: string | undefined) => void
  /**
   * Whether the dropdown is disabled
   */
  disabled?: boolean
  /**
   * Whether to show flag emojis in the dropdown
   */
  showFlags?: boolean
  /**
   * Placeholder text when no country is selected
   */
  placeholder?: string
  /**
   * Additional CSS classes for the trigger button
   */
  className?: string
}

/**
 * CountryDropdown component for selecting countries with search functionality
 *
 * Features:
 * - Searchable dropdown with country list and flag emojis
 * - Keyboard navigation support for accessibility
 * - "Prefer not to say" option at the top of the list
 * - Handles selection state and change events
 * - Supports disabled state
 * - Virtual scrolling for performance with large country lists
 * - Lazy loading of flag emojis for mobile optimization
 */
export const CountryDropdown = React.memo<CountryDropdownProps>(
  function CountryDropdown({
    value,
    onChange,
    disabled = false,
    showFlags = true,
    placeholder = 'Select country',
    className,
  }) {
    const [open, setOpen] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState('')
    const [focusedIndex, setFocusedIndex] = React.useState(0)
    const [scrollTop, setScrollTop] = React.useState(0)
    const searchInputRef = React.useRef<HTMLInputElement>(null)
    const itemRefs = React.useRef<(HTMLDivElement | null)[]>([])
    const scrollContainerRef = React.useRef<HTMLDivElement>(null)

    // Get current country or fallback - memoized for performance
    const selectedCountry = React.useMemo(() => {
      if (!value) return null
      return COUNTRIES.find((country) => country.code === value) || null
    }, [value])

    // Filter countries based on search query - debounced for performance
    const filteredCountries = React.useMemo(() => {
      return searchCountries(searchQuery)
    }, [searchQuery])

    // Virtual scrolling calculations
    const { visibleItems, totalHeight, offsetY } = React.useMemo(() => {
      const startIndex = Math.floor(scrollTop / ITEM_HEIGHT)
      const endIndex = Math.min(
        startIndex + VISIBLE_ITEMS + BUFFER_SIZE,
        filteredCountries.length,
      )
      const visibleStartIndex = Math.max(0, startIndex - BUFFER_SIZE)

      return {
        visibleItems: filteredCountries
          .slice(visibleStartIndex, endIndex)
          .map((country, index) => ({
            ...country,
            originalIndex: visibleStartIndex + index,
          })),
        totalHeight: filteredCountries.length * ITEM_HEIGHT,
        offsetY: visibleStartIndex * ITEM_HEIGHT,
      }
    }, [filteredCountries, scrollTop])

    // Handle scroll for virtual scrolling
    const handleScroll = React.useCallback(
      (e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop)
      },
      [],
    )

    // Reset search and focus when dropdown opens/closes
    React.useEffect(() => {
      if (open) {
        setSearchQuery('')
        setFocusedIndex(0)
        setScrollTop(0)
        // Focus search input after dropdown opens
        setTimeout(() => {
          searchInputRef.current?.focus()
        }, 0)
      }
    }, [open])

    // Handle keyboard navigation with virtual scrolling support
    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent) => {
        if (!open) return

        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault()
            setFocusedIndex((prev) => {
              const newIndex =
                prev < filteredCountries.length - 1 ? prev + 1 : 0
              // Auto-scroll to keep focused item visible
              const itemTop = newIndex * ITEM_HEIGHT
              const itemBottom = itemTop + ITEM_HEIGHT
              const visibleTop = scrollTop
              const visibleBottom = scrollTop + VISIBLE_ITEMS * ITEM_HEIGHT

              if (itemBottom > visibleBottom) {
                setScrollTop(itemTop - (VISIBLE_ITEMS - 1) * ITEM_HEIGHT)
              } else if (itemTop < visibleTop) {
                setScrollTop(itemTop)
              }

              return newIndex
            })
            break
          case 'ArrowUp':
            event.preventDefault()
            setFocusedIndex((prev) => {
              const newIndex =
                prev > 0 ? prev - 1 : filteredCountries.length - 1
              // Auto-scroll to keep focused item visible
              const itemTop = newIndex * ITEM_HEIGHT
              const itemBottom = itemTop + ITEM_HEIGHT
              const visibleTop = scrollTop
              const visibleBottom = scrollTop + VISIBLE_ITEMS * ITEM_HEIGHT

              if (itemTop < visibleTop) {
                setScrollTop(itemTop)
              } else if (itemBottom > visibleBottom) {
                setScrollTop(itemTop - (VISIBLE_ITEMS - 1) * ITEM_HEIGHT)
              }

              return newIndex
            })
            break
          case 'Enter':
            event.preventDefault()
            if (focusedIndex >= 0 && focusedIndex < filteredCountries.length) {
              const selectedCountry = filteredCountries[focusedIndex]
              onChange(
                selectedCountry.code === 'unknown'
                  ? undefined
                  : selectedCountry.code,
              )
              setOpen(false)
            }
            break
          case 'Escape':
            event.preventDefault()
            setOpen(false)
            break
        }
      },
      [open, filteredCountries, focusedIndex, onChange, scrollTop],
    )

    // Handle country selection
    const handleCountrySelect = React.useCallback(
      (country: Country) => {
        onChange(country.code === 'unknown' ? undefined : country.code)
        setOpen(false)
      },
      [onChange],
    )

    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label="Select country"
            disabled={disabled}
            className={cn(
              'w-full justify-between text-left font-normal',
              !selectedCountry && 'text-muted-foreground',
              className,
            )}
          >
            <span className="flex items-center gap-2 truncate">
              {selectedCountry ? (
                <>
                  {showFlags && (
                    <FlagDisplay countryCode={selectedCountry.code} size="sm" />
                  )}
                  <span className="truncate">{selectedCountry.name}</span>
                </>
              ) : (
                placeholder
              )}
            </span>
            <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[--radix-dropdown-menu-trigger-width] p-0"
          align="start"
          onKeyDown={handleKeyDown}
        >
          {/* Search input */}
          <div className="flex items-center border-b px-3 py-2">
            <SearchIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search countries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* Country list with virtual scrolling */}
          <div
            ref={scrollContainerRef}
            className="max-h-[320px] overflow-y-auto"
            onScroll={handleScroll}
            style={{
              scrollBehavior: 'smooth',
              // Optimize scrolling performance on mobile
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {filteredCountries.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No countries found
              </div>
            ) : (
              <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ transform: `translateY(${offsetY}px)` }}>
                  {visibleItems.map((country) => (
                    <React.Fragment key={country.code}>
                      {/* Separator after "Prefer not to say" */}
                      {country.originalIndex === 1 &&
                        country.code !== 'unknown' && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        ref={(el) => {
                          itemRefs.current[country.originalIndex] = el
                        }}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 cursor-pointer',
                          focusedIndex === country.originalIndex && 'bg-accent',
                          value === country.code && 'bg-accent/50',
                        )}
                        style={{
                          height: ITEM_HEIGHT,
                          minHeight: ITEM_HEIGHT,
                        }}
                        onSelect={() => handleCountrySelect(country)}
                        onMouseEnter={() =>
                          setFocusedIndex(country.originalIndex)
                        }
                      >
                        {showFlags && (
                          <FlagDisplay
                            countryCode={country.code}
                            size="sm"
                            lazy={true} // Enable lazy loading for performance
                          />
                        )}
                        <span className="flex-1 truncate">{country.name}</span>
                        {value === country.code && (
                          <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
                        )}
                      </DropdownMenuItem>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  },
)
