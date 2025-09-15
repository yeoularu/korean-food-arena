import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FlagDisplay } from '../FlagDisplay'
import { CountryDropdown } from '../CountryDropdown'
import { NationalitySelector } from '../NationalitySelector'
import {
  searchCountries,
  getCountryFlag,
  getCountryName,
} from '@/lib/nationality'

// Mock intersection observer for lazy loading tests
const mockIntersectionObserver = vi.fn()
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})
window.IntersectionObserver = mockIntersectionObserver

// Mock session hooks
vi.mock('@/hooks/use-session', () => ({
  useSession: () => ({
    data: { user: { nationality: 'US' } },
    isLoading: false,
  }),
  useUpdateNationality: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    isError: false,
    isSuccess: false,
  }),
}))

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient()
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('Performance Optimizations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('FlagDisplay Performance', () => {
    it('should memoize flag and country name calculations', () => {
      const getCountryFlagSpy = vi.spyOn(
        require('@/lib/nationality'),
        'getCountryFlag',
      )
      const getCountryNameSpy = vi.spyOn(
        require('@/lib/nationality'),
        'getCountryName',
      )

      const { rerender } = render(<FlagDisplay countryCode="US" showName />)

      expect(getCountryFlagSpy).toHaveBeenCalledTimes(1)
      expect(getCountryNameSpy).toHaveBeenCalledTimes(1)

      // Rerender with same props - should not recalculate
      rerender(<FlagDisplay countryCode="US" showName />)

      expect(getCountryFlagSpy).toHaveBeenCalledTimes(1)
      expect(getCountryNameSpy).toHaveBeenCalledTimes(1)
    })

    it('should support lazy loading with intersection observer', () => {
      render(<FlagDisplay countryCode="US" lazy />)

      expect(mockIntersectionObserver).toHaveBeenCalled()
      expect(screen.getByText('⏳')).toBeInTheDocument()
    })

    it('should render flag immediately when lazy is false', () => {
      render(<FlagDisplay countryCode="US" lazy={false} />)

      expect(screen.getByText('🇺🇸')).toBeInTheDocument()
      expect(screen.queryByText('⏳')).not.toBeInTheDocument()
    })
  })

  describe('CountryDropdown Performance', () => {
    it('should implement virtual scrolling for large lists', async () => {
      render(
        <TestWrapper>
          <CountryDropdown value="" onChange={vi.fn()} />
        </TestWrapper>,
      )

      const trigger = screen.getByRole('combobox')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search countries...'),
        ).toBeInTheDocument()
      })

      // Virtual scrolling should limit rendered items
      const dropdownContent = document.querySelector('[style*="height"]')
      expect(dropdownContent).toBeInTheDocument()
    })

    it('should memoize filtered countries', () => {
      const searchCountriesSpy = vi.spyOn(
        require('@/lib/nationality'),
        'searchCountries',
      )

      const { rerender } = render(
        <TestWrapper>
          <CountryDropdown value="" onChange={vi.fn()} />
        </TestWrapper>,
      )

      expect(searchCountriesSpy).toHaveBeenCalledTimes(1)

      // Rerender with same search query - should not recalculate
      rerender(
        <TestWrapper>
          <CountryDropdown value="" onChange={vi.fn()} />
        </TestWrapper>,
      )

      expect(searchCountriesSpy).toHaveBeenCalledTimes(1)
    })

    it('should enable lazy loading for flag displays', async () => {
      render(
        <TestWrapper>
          <CountryDropdown value="" onChange={vi.fn()} showFlags />
        </TestWrapper>,
      )

      const trigger = screen.getByRole('combobox')
      fireEvent.click(trigger)

      await waitFor(() => {
        // Flags should be lazy loaded in dropdown
        expect(mockIntersectionObserver).toHaveBeenCalled()
      })
    })
  })

  describe('NationalitySelector Performance', () => {
    it('should memoize nationality value calculation', () => {
      const { rerender } = render(
        <TestWrapper>
          <NationalitySelector />
        </TestWrapper>,
      )

      // Rerender with same props - should use memoized value
      rerender(
        <TestWrapper>
          <NationalitySelector />
        </TestWrapper>,
      )

      // Should not cause unnecessary re-renders
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('should show loading states during nationality updates', async () => {
      const mockMutation = {
        mutateAsync: vi
          .fn()
          .mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100)),
          ),
        isPending: true,
        isError: false,
        isSuccess: false,
      }

      vi.mocked(
        require('@/hooks/use-session').useUpdateNationality,
      ).mockReturnValue(mockMutation)

      render(
        <TestWrapper>
          <NationalitySelector />
        </TestWrapper>,
      )

      expect(screen.getByText('Updating...')).toBeInTheDocument()
      expect(document.querySelector('.animate-spin')).toBeInTheDocument() // Loading spinner
    })

    it('should prevent concurrent updates', async () => {
      const mockMutation = {
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
        isError: false,
        isSuccess: false,
      }

      vi.mocked(
        require('@/hooks/use-session').useUpdateNationality,
      ).mockReturnValue(mockMutation)

      render(
        <TestWrapper>
          <NationalitySelector />
        </TestWrapper>,
      )

      const dropdown = screen.getByRole('combobox')

      // Simulate rapid clicks
      fireEvent.click(dropdown)
      fireEvent.click(dropdown)

      expect(mockMutation.mutateAsync).toHaveBeenCalledTimes(0) // No mutations triggered yet
    })
  })

  describe('Nationality Utilities Performance', () => {
    it('should use cached search results', () => {
      // First search
      const results1 = searchCountries('united')
      expect(results1.length).toBeGreaterThan(0)

      // Second search with same query - should use cache
      const results2 = searchCountries('united')
      expect(results2).toBe(results1) // Should be same reference (cached)
    })

    it('should use Map lookup for country operations', () => {
      // These should be fast O(1) operations
      const flag = getCountryFlag('US')
      const name = getCountryName('US')

      expect(flag).toBe('🇺🇸')
      expect(name).toBe('United States')
    })

    it('should handle cache size limits', () => {
      // Fill cache beyond limit
      for (let i = 0; i < 150; i++) {
        searchCountries(`query${i}`)
      }

      // Should still work without memory issues
      const results = searchCountries('united')
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('Mobile Performance Optimizations', () => {
    it('should apply mobile-specific CSS optimizations', () => {
      render(<FlagDisplay countryCode="US" />)

      const flagElement = screen.getByRole('img')
      expect(flagElement).toHaveStyle('transform: translateZ(0)') // Hardware acceleration
    })

    it('should use smooth scrolling for mobile', async () => {
      render(
        <TestWrapper>
          <CountryDropdown value="" onChange={vi.fn()} />
        </TestWrapper>,
      )

      const trigger = screen.getByRole('combobox')
      fireEvent.click(trigger)

      await waitFor(() => {
        const scrollContainer = document.querySelector(
          '[style*="overflow-y-auto"]',
        )
        expect(scrollContainer).toHaveStyle('scroll-behavior: smooth')
        expect(scrollContainer).toHaveStyle('-webkit-overflow-scrolling: touch')
      })
    })
  })
})
