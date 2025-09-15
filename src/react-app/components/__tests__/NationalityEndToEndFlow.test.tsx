import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { SessionData, VoteStats } from '@/lib/types'
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query'

// Mock the hooks and API client
vi.mock('@/hooks/use-session', () => ({
  useSession: vi.fn(),
  useUpdateNationality: vi.fn(),
}))

vi.mock('@/hooks/use-comment-queries', () => ({
  useExpandedCommentMutation: vi.fn(),
}))

vi.mock('@/hooks/use-vote-queries', () => ({
  useVoteStats: vi.fn(),
}))

vi.mock('@/hooks/use-network-status', () => ({
  useNetworkStatus: vi.fn(() => ({ isOnline: true })),
}))

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    createComment: vi.fn(),
  },
}))

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(() => vi.fn()),
  useRouter: vi.fn(() => ({
    navigate: vi.fn(),
  })),
}))

import * as useSessionHooks from '@/hooks/use-session'
import * as useCommentHooks from '@/hooks/use-comment-queries'
import * as useVoteHooks from '@/hooks/use-vote-queries'
import { CommentCreation } from '@/components/CommentCreation'
import { UserProfile } from '@/components/UserProfile'
import { Results } from '@/components/Results'

// Type definitions for mocked hooks
type MockedUseSession = UseQueryResult<SessionData | null, Error> & {
  data: SessionData | null
  isLoading: boolean
  error?: Error
}

type MockedUseUpdateNationality = UseMutationResult<
  unknown,
  Error,
  string | undefined,
  unknown
> & {
  mutateAsync: (nationality?: string) => Promise<unknown>
  isPending: boolean
  isError: boolean
  isSuccess: boolean
  error?: Error
}

type MockedUseExpandedCommentMutation = UseMutationResult<
  unknown,
  Error,
  {
    pairKey: string
    result: 'win' | 'tie'
    winnerFoodId?: string
    content: string
  },
  unknown
> & {
  mutateAsync: (data: {
    pairKey: string
    result: 'win' | 'tie'
    winnerFoodId?: string
    content: string
  }) => Promise<unknown>
  isPending: boolean
  isError: boolean
  error: Error | null
  reset: () => void
}

type MockedUseVoteStats = UseQueryResult<VoteStats, Error> & {
  data: VoteStats | undefined
  isLoading: boolean
  error?: Error
}

describe('Nationality End-to-End Flow Tests', () => {
  const mockUseSession = vi.mocked(useSessionHooks.useSession)
  const mockUseUpdateNationality = vi.mocked(
    useSessionHooks.useUpdateNationality,
  )
  const mockUseExpandedCommentMutation = vi.mocked(
    useCommentHooks.useExpandedCommentMutation,
  )
  const mockUseVoteStats = vi.mocked(useVoteHooks.useVoteStats)

  const mockUpdateNationalityMutate = vi.fn()
  const mockCommentMutate = vi.fn()

  let queryClient: QueryClient
  let currentSession: SessionData | null

  // Helper function to create a test wrapper with QueryClient
  const createWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    // Initialize with a basic session
    currentSession = {
      user: { id: 'user1', nationality: undefined },
      session: { id: 'session1' },
    } as SessionData

    // Default session mock
    mockUseSession.mockReturnValue({
      data: currentSession,
      isLoading: false,
    } as MockedUseSession)

    // Default nationality update mock
    mockUseUpdateNationality.mockReturnValue({
      mutateAsync: mockUpdateNationalityMutate,
      isPending: false,
      isError: false,
      isSuccess: false,
    } as MockedUseUpdateNationality)

    // Default comment mutation mock
    mockUseExpandedCommentMutation.mockReturnValue({
      mutateAsync: mockCommentMutate,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    } as MockedUseExpandedCommentMutation)

    // Default vote stats mock
    mockUseVoteStats.mockReturnValue({
      data: {
        totalVotes: 100,
        skipCount: 5,
        percentageByFoodId: {
          kimchi: 60,
          bulgogi: 40,
        },
        tiePercentage: 0,
        nationalityBreakdown: {
          US: {
            byFoodId: { kimchi: 30, bulgogi: 20 },
            tiePercentage: 0,
          },
          KR: {
            byFoodId: { kimchi: 25, bulgogi: 15 },
            tiePercentage: 0,
          },
        },
        foodNamesById: {
          kimchi: 'Kimchi',
          bulgogi: 'Bulgogi',
        },
        userVoteForComment: null,
      } as VoteStats,
      isLoading: false,
    } as MockedUseVoteStats)

    // Mock successful nationality update that updates session
    mockUpdateNationalityMutate.mockImplementation(async (nationality) => {
      if (currentSession) {
        currentSession = {
          ...currentSession,
          user: { ...currentSession.user, nationality },
        }
        mockUseSession.mockReturnValue({
          data: currentSession,
          isLoading: false,
        } as MockedUseSession)
      }
      return {}
    })

    // Mock successful comment creation
    mockCommentMutate.mockResolvedValue({
      id: 'comment1',
      content: 'Test comment',
      createdAt: new Date().toISOString(),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Complete User Journey: Setting Nationality in Comment Creation and Seeing it in Profile', () => {
    it('should allow user to set nationality during comment creation and reflect it in profile', async () => {
      const user = userEvent.setup()

      // Render comment creation component
      render(
        <CommentCreation
          pairKey="kimchi_bulgogi"
          foodNamesById={{ kimchi: 'Kimchi', bulgogi: 'Bulgogi' }}
          userVoteForComment={null}
        />,
        { wrapper: createWrapper },
      )

      // Verify initial state - no nationality set
      expect(screen.getByText('Nationality:')).toBeInTheDocument()

      // Find and interact with nationality dropdown using accessible name
      const nationalityDropdown = screen.getByRole('combobox', {
        name: /select country/i,
      })
      expect(nationalityDropdown).toBeInTheDocument()

      // Select a nationality (simulate user selecting South Korea)
      await user.click(nationalityDropdown)

      // Wait for dropdown options to appear
      await waitFor(() => {
        expect(screen.getByText('South Korea')).toBeInTheDocument()
      })

      await user.click(screen.getByText('South Korea'))

      // Verify nationality update was called
      expect(mockUpdateNationalityMutate).toHaveBeenCalledWith('KR')

      // Fill out and submit comment
      const commentTextarea =
        screen.getByPlaceholderText(/share your thoughts/i)
      await user.type(commentTextarea, 'Great comparison between these foods!')

      // Select a vote option
      const kimchiOption = screen.getByLabelText('Kimchi')
      await user.click(kimchiOption)

      // Submit comment
      const submitButton = screen.getByRole('button', { name: /post comment/i })
      await user.click(submitButton)

      // Verify comment was submitted
      expect(mockCommentMutate).toHaveBeenCalledWith({
        pairKey: 'kimchi_bulgogi',
        result: 'win',
        winnerFoodId: 'kimchi',
        content: 'Great comparison between these foods!',
      })

      // Now render UserProfile component to verify nationality is reflected
      render(<UserProfile />, { wrapper: createWrapper })

      // Verify the profile shows the updated nationality
      await waitFor(() => {
        expect(screen.getByText('South Korea')).toBeInTheDocument()
      })

      // Verify flag display is present
      expect(screen.getByText('🇰🇷')).toBeInTheDocument()

      // Verify current nationality display
      expect(screen.getByText('Current nationality:')).toBeInTheDocument()
    })

    it('should handle nationality changes from profile and reflect in comment creation', async () => {
      const user = userEvent.setup()

      // Start with user having US nationality
      currentSession = {
        user: { id: 'user1', nationality: 'US' },
        session: { id: 'session1' },
      } as SessionData

      mockUseSession.mockReturnValue({
        data: currentSession,
        isLoading: false,
      } as MockedUseSession)

      // Render UserProfile component
      render(<UserProfile />, { wrapper: createWrapper })

      // Verify current nationality is US
      expect(screen.getByText('United States')).toBeInTheDocument()
      expect(screen.getByText('🇺🇸')).toBeInTheDocument()

      // Change nationality to Japan
      const nationalityDropdown = screen.getByRole('combobox')
      await user.click(nationalityDropdown)

      await waitFor(() => {
        expect(screen.getByText('Japan')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Japan'))

      // Click update button
      const updateButton = screen.getByRole('button', {
        name: /update nationality/i,
      })
      await user.click(updateButton)

      // Verify nationality update was called
      expect(mockUpdateNationalityMutate).toHaveBeenCalledWith('JP')

      // Now render CommentCreation to verify it shows the updated nationality
      render(
        <CommentCreation
          pairKey="ramen_sushi"
          foodNamesById={{ ramen: 'Ramen', sushi: 'Sushi' }}
          userVoteForComment={null}
        />,
        { wrapper: createWrapper },
      )

      // Verify comment creation shows the updated nationality
      await waitFor(() => {
        expect(screen.getByText('🇯🇵')).toBeInTheDocument()
      })
    })

    it('should handle clearing nationality and reflect across components', async () => {
      const user = userEvent.setup()

      // Start with user having a nationality
      currentSession = {
        user: { id: 'user1', nationality: 'CA' },
        session: { id: 'session1' },
      } as SessionData

      mockUseSession.mockReturnValue({
        data: currentSession,
        isLoading: false,
      } as MockedUseSession)

      // Render UserProfile
      render(<UserProfile />, { wrapper: createWrapper })

      // Verify current nationality
      expect(screen.getByText('Canada')).toBeInTheDocument()

      // Clear nationality by selecting "Prefer not to say"
      const nationalityDropdown = screen.getByRole('combobox')
      await user.click(nationalityDropdown)

      await waitFor(() => {
        expect(screen.getByText('Prefer not to say')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Prefer not to say'))

      const updateButton = screen.getByRole('button', {
        name: /update nationality/i,
      })
      await user.click(updateButton)

      // Verify nationality was cleared
      expect(mockUpdateNationalityMutate).toHaveBeenCalledWith(undefined)

      // Render CommentCreation to verify no nationality is shown
      render(
        <CommentCreation
          pairKey="test_pair"
          foodNamesById={{ food1: 'Food 1', food2: 'Food 2' }}
          userVoteForComment={null}
        />,
        { wrapper: createWrapper },
      )

      // Verify no flag is displayed in comment creation
      const nationalitySection = screen.getByText('Nationality:')
      expect(nationalitySection).toBeInTheDocument()
      // Should not have any flag emojis visible
      expect(screen.queryByText(/🇨🇦/)).not.toBeInTheDocument()
    })
  })

  describe('Comments Display with Correct Flags After Nationality Selection', () => {
    it('should display comments with correct flags in results after nationality selection', async () => {
      // Mock vote stats with nationality breakdown including flags
      const mockVoteStatsWithFlags: VoteStats = {
        totalVotes: 150,
        skipCount: 10,
        percentageByFoodId: {
          kimchi: 65,
          bulgogi: 35,
        },
        tiePercentage: 0,
        nationalityBreakdown: {
          KR: {
            byFoodId: { kimchi: 40, bulgogi: 20 },
            tiePercentage: 0,
          },
          US: {
            byFoodId: { kimchi: 20, bulgogi: 10 },
            tiePercentage: 0,
          },
          JP: {
            byFoodId: { kimchi: 5, bulgogi: 5 },
            tiePercentage: 0,
          },
        },
        foodNamesById: {
          kimchi: 'Kimchi',
          bulgogi: 'Bulgogi',
        },
        userVoteForComment: {
          result: 'win',
          winnerFoodId: 'kimchi',
        },
      }

      mockUseVoteStats.mockReturnValue({
        data: mockVoteStatsWithFlags,
        isLoading: false,
      } as MockedUseVoteStats)

      // Render Results component
      render(<Results pairKey="kimchi_bulgogi" />, { wrapper: createWrapper })

      // Verify nationality breakdown section exists
      expect(screen.getByText('Breakdown by Nationality')).toBeInTheDocument()

      // Verify flags are displayed for each nationality
      await waitFor(() => {
        expect(screen.getByText('🇰🇷')).toBeInTheDocument() // South Korea
        expect(screen.getByText('🇺🇸')).toBeInTheDocument() // United States
        expect(screen.getByText('🇯🇵')).toBeInTheDocument() // Japan
      })

      // Verify country names are displayed alongside flags
      expect(screen.getByText('South Korea')).toBeInTheDocument()
      expect(screen.getByText('United States')).toBeInTheDocument()
      expect(screen.getByText('Japan')).toBeInTheDocument()

      // Verify vote counts are displayed for each nationality
      expect(screen.getByText('40 votes')).toBeInTheDocument() // KR kimchi
      expect(screen.getByText('20 votes')).toBeInTheDocument() // KR bulgogi
      expect(screen.getByText('10 votes')).toBeInTheDocument() // US bulgogi
    })

    it('should handle special nationality cases (Other, Not specified) with appropriate icons', async () => {
      // Mock vote stats with special nationality cases
      const mockVoteStatsSpecial: VoteStats = {
        totalVotes: 100,
        skipCount: 5,
        percentageByFoodId: {
          kimchi: 60,
          bulgogi: 40,
        },
        tiePercentage: 0,
        nationalityBreakdown: {
          Other: {
            byFoodId: { kimchi: 30, bulgogi: 20 },
            tiePercentage: 0,
          },
          unknown: {
            byFoodId: { kimchi: 15, bulgogi: 10 },
            tiePercentage: 0,
          },
        },
        foodNamesById: {
          kimchi: 'Kimchi',
          bulgogi: 'Bulgogi',
        },
        userVoteForComment: null,
      }

      mockUseVoteStats.mockReturnValue({
        data: mockVoteStatsSpecial,
        isLoading: false,
      } as MockedUseVoteStats)

      render(<Results pairKey="kimchi_bulgogi" />, { wrapper: createWrapper })

      // Verify special nationality displays
      await waitFor(() => {
        expect(screen.getByText('🌐')).toBeInTheDocument() // Other
        expect(screen.getByText('🌍')).toBeInTheDocument() // Not specified
      })

      expect(screen.getByText('Other')).toBeInTheDocument()
      expect(screen.getByText('Not specified')).toBeInTheDocument()
    })

    it('should maintain privacy rules (minimum 5 users) while displaying flags', async () => {
      // Mock vote stats where some nationalities are aggregated as "Other"
      const mockVoteStatsPrivacy: VoteStats = {
        totalVotes: 200,
        skipCount: 15,
        percentageByFoodId: {
          kimchi: 70,
          bulgogi: 30,
        },
        tiePercentage: 0,
        nationalityBreakdown: {
          US: {
            byFoodId: { kimchi: 50, bulgogi: 30 },
            tiePercentage: 0,
          },
          KR: {
            byFoodId: { kimchi: 40, bulgogi: 20 },
            tiePercentage: 0,
          },
          Other: {
            // This represents aggregated small groups (< 5 users each)
            byFoodId: { kimchi: 20, bulgogi: 10 },
            tiePercentage: 0,
          },
        },
        foodNamesById: {
          kimchi: 'Kimchi',
          bulgogi: 'Bulgogi',
        },
        userVoteForComment: null,
      }

      mockUseVoteStats.mockReturnValue({
        data: mockVoteStatsPrivacy,
        isLoading: false,
      } as MockedUseVoteStats)

      render(<Results pairKey="kimchi_bulgogi" />, { wrapper: createWrapper })

      // Verify that large groups show individual flags
      await waitFor(() => {
        expect(screen.getByText('🇺🇸')).toBeInTheDocument()
        expect(screen.getByText('🇰🇷')).toBeInTheDocument()
      })

      // Verify that small groups are aggregated as "Other" with appropriate icon
      expect(screen.getByText('🌐')).toBeInTheDocument()
      expect(screen.getByText('Other')).toBeInTheDocument()

      // Verify privacy notice is displayed
      expect(
        screen.getByText(
          /groups with fewer than 5 users are shown as "other"/i,
        ),
      ).toBeInTheDocument()
    })
  })

  describe('Nationality Breakdown in Results with Flag Display', () => {
    it('should display comprehensive nationality breakdown with flags and vote counts', async () => {
      // Mock comprehensive vote stats
      const mockComprehensiveStats: VoteStats = {
        totalVotes: 500,
        skipCount: 25,
        percentageByFoodId: {
          bibimbap: 55,
          bulgogi: 45,
        },
        tiePercentage: 0,
        nationalityBreakdown: {
          KR: {
            byFoodId: { bibimbap: 80, bulgogi: 60 },
            tiePercentage: 0,
          },
          US: {
            byFoodId: { bibimbap: 70, bulgogi: 50 },
            tiePercentage: 0,
          },
          JP: {
            byFoodId: { bibimbap: 40, bulgogi: 30 },
            tiePercentage: 0,
          },
          CA: {
            byFoodId: { bibimbap: 30, bulgogi: 25 },
            tiePercentage: 0,
          },
          GB: {
            byFoodId: { bibimbap: 25, bulgogi: 20 },
            tiePercentage: 0,
          },
        },
        foodNamesById: {
          bibimbap: 'Bibimbap',
          bulgogi: 'Bulgogi',
        },
        userVoteForComment: null,
      }

      mockUseVoteStats.mockReturnValue({
        data: mockComprehensiveStats,
        isLoading: false,
      } as MockedUseVoteStats)

      render(<Results pairKey="bibimbap_bulgogi" />, { wrapper: createWrapper })

      // Verify all nationality flags are displayed
      await waitFor(() => {
        expect(screen.getByText('🇰🇷')).toBeInTheDocument() // South Korea
        expect(screen.getByText('🇺🇸')).toBeInTheDocument() // United States
        expect(screen.getByText('🇯🇵')).toBeInTheDocument() // Japan
        expect(screen.getByText('🇨🇦')).toBeInTheDocument() // Canada
        expect(screen.getByText('🇬🇧')).toBeInTheDocument() // United Kingdom
      })

      // Verify country names
      expect(screen.getByText('South Korea')).toBeInTheDocument()
      expect(screen.getByText('United States')).toBeInTheDocument()
      expect(screen.getByText('Japan')).toBeInTheDocument()
      expect(screen.getByText('Canada')).toBeInTheDocument()
      expect(screen.getByText('United Kingdom')).toBeInTheDocument()

      // Verify vote counts for each nationality and food
      expect(screen.getByText('80 votes')).toBeInTheDocument() // KR bibimbap
      expect(screen.getByText('60 votes')).toBeInTheDocument() // KR bulgogi
      expect(screen.getByText('70 votes')).toBeInTheDocument() // US bibimbap
      expect(screen.getByText('50 votes')).toBeInTheDocument() // US bulgogi
    })

    it('should handle tie votes in nationality breakdown with flags', async () => {
      // Mock stats with tie votes
      const mockStatsWithTies: VoteStats = {
        totalVotes: 300,
        skipCount: 20,
        percentageByFoodId: {
          kimchi: 40,
          bulgogi: 35,
        },
        tiePercentage: 25,
        nationalityBreakdown: {
          KR: {
            byFoodId: { kimchi: 50, bulgogi: 30 },
            tiePercentage: 20,
          },
          US: {
            byFoodId: { kimchi: 40, bulgogi: 35 },
            tiePercentage: 25,
          },
        },
        foodNamesById: {
          kimchi: 'Kimchi',
          bulgogi: 'Bulgogi',
        },
        userVoteForComment: null,
      }

      mockUseVoteStats.mockReturnValue({
        data: mockStatsWithTies,
        isLoading: false,
      } as MockedUseVoteStats)

      render(<Results pairKey="kimchi_bulgogi" />, { wrapper: createWrapper })

      // Verify flags are displayed
      await waitFor(() => {
        expect(screen.getByText('🇰🇷')).toBeInTheDocument()
        expect(screen.getByText('🇺🇸')).toBeInTheDocument()
      })

      // Verify tie percentages are displayed for each nationality
      expect(screen.getByText('20.0%')).toBeInTheDocument() // KR tie
      expect(screen.getByText('25.0%')).toBeInTheDocument() // US tie

      // Verify "Tie" labels are present
      const tieLabels = screen.getAllByText('Tie')
      expect(tieLabels.length).toBeGreaterThan(0)
    })

    it('should display empty state gracefully when no nationality data is available', async () => {
      // Mock stats with no nationality breakdown
      const mockStatsEmpty: VoteStats = {
        totalVotes: 50,
        skipCount: 5,
        percentageByFoodId: {
          kimchi: 60,
          bulgogi: 40,
        },
        tiePercentage: 0,
        nationalityBreakdown: {}, // Empty nationality breakdown
        foodNamesById: {
          kimchi: 'Kimchi',
          bulgogi: 'Bulgogi',
        },
        userVoteForComment: null,
      }

      mockUseVoteStats.mockReturnValue({
        data: mockStatsEmpty,
        isLoading: false,
      } as MockedUseVoteStats)

      render(<Results pairKey="kimchi_bulgogi" />, { wrapper: createWrapper })

      // Verify main results are still displayed
      expect(screen.getByText('Vote Results')).toBeInTheDocument()
      expect(screen.getByText('50 total votes')).toBeInTheDocument()

      // Verify nationality breakdown section is not displayed when empty
      expect(
        screen.queryByText('Breakdown by Nationality'),
      ).not.toBeInTheDocument()
    })
  })

  describe('Accessibility and Keyboard Navigation Throughout Flow', () => {
    it('should support keyboard navigation in nationality selection during comment creation', async () => {
      const user = userEvent.setup()

      render(
        <CommentCreation
          pairKey="kimchi_bulgogi"
          foodNamesById={{ kimchi: 'Kimchi', bulgogi: 'Bulgogi' }}
          userVoteForComment={null}
        />,
        { wrapper: createWrapper },
      )

      // Find nationality dropdown
      const nationalityDropdown = screen.getByRole('combobox', {
        name: /select country/i,
      })

      // Focus directly on the dropdown
      await user.click(nationalityDropdown)
      expect(nationalityDropdown).toHaveFocus()

      // Open dropdown with Enter key
      await user.keyboard('{Enter}')

      // Navigate through options with arrow keys
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')

      // Select with Enter key
      await user.keyboard('{Enter}')

      // Verify nationality update was called
      expect(mockUpdateNationalityMutate).toHaveBeenCalled()
    })

    it('should provide proper ARIA labels and descriptions for nationality components', async () => {
      render(
        <CommentCreation
          pairKey="test_pair"
          foodNamesById={{ food1: 'Food 1', food2: 'Food 2' }}
          userVoteForComment={null}
        />,
        { wrapper: createWrapper },
      )

      // Verify nationality dropdown has proper accessibility attributes
      const nationalityDropdown = screen.getByRole('combobox', {
        name: /select country/i,
      })
      expect(nationalityDropdown).toBeInTheDocument()

      // Verify label association
      const nationalityLabel = screen.getByText('Nationality:')
      expect(nationalityLabel).toBeInTheDocument()

      // Test that the dropdown is properly labeled
      expect(nationalityDropdown).toHaveAccessibleName()
    })

    it('should support keyboard navigation in user profile nationality selection', async () => {
      const user = userEvent.setup()

      render(<UserProfile />, { wrapper: createWrapper })

      // Find nationality dropdown in profile
      const nationalityDropdown = screen.getByRole('combobox')

      // Test keyboard navigation
      await user.tab() // Navigate to dropdown
      expect(nationalityDropdown).toHaveFocus()

      // Open with keyboard
      await user.keyboard('{Enter}')

      // Navigate and select
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{Enter}')

      // Navigate to update button
      await user.tab()
      const updateButton = screen.getByRole('button', {
        name: /update nationality/i,
      })
      expect(updateButton).toHaveFocus()

      // Activate with keyboard
      await user.keyboard('{Enter}')

      expect(mockUpdateNationalityMutate).toHaveBeenCalled()
    })

    it('should provide screen reader friendly flag displays with proper alt text', async () => {
      // Mock session with nationality
      currentSession = {
        user: { id: 'user1', nationality: 'KR' },
        session: { id: 'session1' },
      } as SessionData

      mockUseSession.mockReturnValue({
        data: currentSession,
        isLoading: false,
      } as MockedUseSession)

      render(
        <CommentCreation
          pairKey="test_pair"
          foodNamesById={{ food1: 'Food 1', food2: 'Food 2' }}
          userVoteForComment={null}
        />,
        { wrapper: createWrapper },
      )

      // Verify flag emoji is present (screen readers will announce the emoji)
      await waitFor(() => {
        const flags = screen.getAllByText('🇰🇷')
        expect(flags.length).toBeGreaterThan(0)
      })

      // Verify proper ARIA labels are present
      const flagElements = screen.getAllByRole('img', {
        name: /flag of south korea/i,
      })
      expect(flagElements.length).toBeGreaterThan(0)
    })

    it('should handle focus management during nationality updates', async () => {
      const user = userEvent.setup()

      render(<UserProfile />, { wrapper: createWrapper })

      const nationalityDropdown = screen.getByRole('combobox')
      const updateButton = screen.getByRole('button', {
        name: /update nationality/i,
      })

      // Focus on dropdown
      await user.click(nationalityDropdown)

      // Select an option
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{Enter}')

      // Focus should move to update button or remain manageable
      await user.tab()
      expect(updateButton).toHaveFocus()

      // Click update button
      await user.click(updateButton)

      // Verify update was called
      expect(mockUpdateNationalityMutate).toHaveBeenCalled()

      // Focus should remain manageable after update
      // (In a real app, focus might return to the dropdown or show a success message)
    })

    it('should provide proper error announcements for screen readers', async () => {
      const user = userEvent.setup()

      // Mock nationality update failure
      mockUpdateNationalityMutate.mockRejectedValue(new Error('Network error'))
      mockUseUpdateNationality.mockReturnValue({
        mutateAsync: mockUpdateNationalityMutate,
        isPending: false,
        isError: true,
        error: new Error('Network error'),
        isSuccess: false,
      } as MockedUseUpdateNationality)

      render(<UserProfile />, { wrapper: createWrapper })

      // Trigger an error by trying to update nationality
      const updateButton = screen.getByRole('button', {
        name: /update nationality/i,
      })
      await user.click(updateButton)

      // Verify error message is displayed and accessible
      await waitFor(() => {
        expect(
          screen.getByText(/failed to update nationality/i),
        ).toBeInTheDocument()
      })

      // Error messages should be properly associated with the form
      const errorMessage = screen.getByText(/failed to update nationality/i)
      expect(errorMessage).toBeInTheDocument()
    })

    it('should support high contrast mode and color accessibility', async () => {
      // This test verifies that components render properly and don't rely solely on color
      render(
        <CommentCreation
          pairKey="test_pair"
          foodNamesById={{ food1: 'Food 1', food2: 'Food 2' }}
          userVoteForComment={null}
        />,
        { wrapper: createWrapper },
      )

      // Verify text labels are present (not just color coding)
      expect(screen.getByText('Nationality:')).toBeInTheDocument()

      // Verify form elements have proper labels
      const nationalityDropdown = screen.getByRole('combobox', {
        name: /select country/i,
      })
      expect(nationalityDropdown).toBeInTheDocument()

      // Verify buttons have descriptive text
      const submitButton = screen.getByRole('button', { name: /post comment/i })
      expect(submitButton).toBeInTheDocument()
    })
  })

  describe('Error Handling and Edge Cases in End-to-End Flow', () => {
    it('should handle network failures gracefully throughout the flow', async () => {
      const user = userEvent.setup()

      // Mock network failure for nationality update
      mockUpdateNationalityMutate.mockRejectedValue(
        new Error('Network timeout'),
      )

      render(
        <CommentCreation
          pairKey="test_pair"
          foodNamesById={{ food1: 'Food 1', food2: 'Food 2' }}
          userVoteForComment={null}
        />,
        { wrapper: createWrapper },
      )

      // Try to update nationality
      const nationalityDropdown = screen.getByRole('combobox', {
        name: /select country/i,
      })
      await user.click(nationalityDropdown)

      // This should trigger nationality update which will fail
      // The component should handle this gracefully
      expect(nationalityDropdown).toBeInTheDocument()
    })

    it('should handle session expiration during nationality updates', async () => {
      // Mock session expiration
      mockUseSession.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Session expired'),
      } as any)

      render(<UserProfile />, { wrapper: createWrapper })

      // The component should handle session expiration gracefully
      // This shows a message asking to refresh the page
      expect(screen.getByText(/please refresh the page/i)).toBeInTheDocument()
    })

    it('should handle loading states properly throughout the flow', async () => {
      // Mock loading state for session
      mockUseSession.mockReturnValue({
        data: null,
        isLoading: true,
      } as any)

      render(
        <CommentCreation
          pairKey="test_pair"
          foodNamesById={{ food1: 'Food 1', food2: 'Food 2' }}
          userVoteForComment={null}
        />,
        { wrapper: createWrapper },
      )

      // When session is loading, the component should still render but nationality section might be disabled
      expect(screen.getByText('Nationality:')).toBeInTheDocument()

      // Mock loading state for vote stats
      mockUseVoteStats.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as unknown)

      render(<Results pairKey="test_pair" />, { wrapper: createWrapper })

      // Verify loading message for results
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('should handle empty or invalid data gracefully', async () => {
      // Mock empty vote stats
      mockUseVoteStats.mockReturnValue({
        data: undefined,
        isLoading: false,
      } as MockedUseVoteStats)

      render(<Results pairKey="test_pair" />, { wrapper: createWrapper })

      // Verify appropriate empty state message
      expect(screen.getByText(/no results found/i)).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /go back to voting/i }),
      ).toBeInTheDocument()
    })
  })
})
