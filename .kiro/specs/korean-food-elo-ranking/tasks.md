# Implementation Plan

- [ ] 1. Set up project foundation and dependencies
  - Initialize Cloudflare Workers project with Hono framework
  - Install and configure TypeScript, Drizzle ORM, and Better-auth
  - Set up project structure with proper folder organization
  - Configure build and development scripts
  - _Requirements: 7.6_

- [ ] 2. Configure database and authentication system
  - [ ] 2.1 Set up Cloudflare D1 database connection
    - Create D1 database instance and configure connection
    - Set up Drizzle ORM with D1 adapter configuration
    - Create database connection utilities and error handling
    - _Requirements: 7.1, 7.6_

  - [ ] 2.2 Implement Better-auth configuration with anonymous plugin
    - Configure Better-auth with Drizzle adapter for D1
    - Confirm actual table names (user vs users) and update schema references
    - Set up anonymous plugin with optional nationality field in user additionalFields
    - Create auth configuration with proper session management
    - Test anonymous user creation and session handling
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ] 2.3 Create custom database schema with normalized data model
    - Define Drizzle schema for foods table with ELO scoring
    - Define votes table with normalized pairKey, foodLowId/foodHighId, presentedLeftId/presentedRightId, result, and winnerFoodId
    - Define comments table with pairKey, result, winnerFoodId, and content
    - Add composite unique index on votes table (user_id, pair_key) to prevent duplicate voting
    - Implement pairKey normalization utility: min(foodId1,foodId2)+'_'+max(foodId1,foodId2)
    - Generate and apply database migrations using Drizzle Kit
    - _Requirements: 7.1, 7.2, 7.3, 4.6_

- [ ] 3. Implement core ELO calculation system
  - [ ] 3.1 Create ELO calculation service
    - Implement standard ELO algorithm with K-factor of 32
    - Handle win/loss/tie scenarios for rating updates
    - Create utility functions for expected score calculations
    - Write comprehensive unit tests for ELO calculations
    - _Requirements: 1.8, 7.3_

  - [ ] 3.2 Implement vote processing with ELO updates and concurrency control
    - Create vote recording service with D1 database transactions
    - Integrate ELO calculation with vote processing using result and winnerFoodId
    - Handle skip votes (no ELO impact) vs scoring votes (win/tie)
    - Implement optimistic locking with updated_at conditional updates
    - Ensure atomic updates of food ratings and vote records with retry logic
    - _Requirements: 1.5, 1.6, 1.7, 1.8_

- [ ] 4. Build API endpoints with Hono framework
  - [ ] 4.1 Create food management endpoints
    - Implement GET /api/foods/random-pair returning { presentedLeft: Food, presentedRight: Food }
    - Implement GET /api/foods/leaderboard for rankings display
    - Add proper error handling and response formatting
    - Include data validation and sanitization
    - _Requirements: 1.1, 2.1, 2.2_

  - [ ] 4.2 Create voting system endpoints
    - Implement POST /api/votes accepting { pairKey, foodLowId, foodHighId, presentedLeftId, presentedRightId, result, winnerFoodId }
    - Implement GET /api/votes/stats/:pairKey returning { totalVotes, countsByFoodId, tieCount, skipCount, percentageByFoodId, tiePercentage, nationalityBreakdown }
    - Add nationality-based vote breakdown by joining with user.nationality at query time with minimum group size privacy (N ≥ 5)
    - Handle (user_id, pair_key) unique constraint violations with 409 Conflict response
    - Implement optimistic locking retry logic (max 3 retries, backoff 50ms → 100ms → 200ms)
    - Exclude skip votes from ELO and percentage calculations
    - Integrate with Better-auth session management
    - Implement Zod validation for all request/response schemas
    - _Requirements: 1.5, 1.6, 1.7, 1.8, 4.1, 4.2, 4.6, 5.1, 5.2, 5.3_

  - [ ] 4.3 Create comments system endpoints
    - Implement POST /api/comments accepting { pairKey, result, winnerFoodId, content }
    - Implement GET /api/comments/:pairKey returning Comment[] with nationality from user profile via join
    - Add content validation (plain text, max 280 characters), sanitization, and XSS prevention
    - Ensure proper user association through Better-auth sessions
    - Add access control to verify user has voted on pairKey before showing comments
    - _Requirements: 3.1, 3.2, 3.3, 4.3, 4.4, 4.5, 4.6_

- [ ] 5. Develop React frontend with TanStack Router and Query
  - [ ] 5.1 Set up React application structure
    - Initialize React SPA with TypeScript configuration
    - Configure TanStack Router for client-side routing
    - Set up TanStack Query with QueryClient and providers
    - Set up Better-auth client with anonymous plugin
    - Create base layout and navigation components
    - _Requirements: 1.1, 6.1_

  - [ ] 5.2 Create TanStack Query hooks and API layer
    - Create custom hooks for food data fetching (useFoodPair, useLeaderboard)
    - Implement mutation hooks for voting and comments with conservative invalidation approach (no optimistic updates in v1)
    - Set up targeted query invalidation: invalidateQueries(['votes', 'stats', pairKey]) for specific pair stats
    - Add error handling and loading states for all queries with proper error code handling (400/401/403/409)
    - Implement pairKey-based query keys for consistent caching
    - Update API calls to use normalized data structure (foodLowId/foodHighId, result, winnerFoodId)
    - _Requirements: 1.1, 2.3, 4.1, 4.2, 5.1, 5.2_

  - [ ] 5.3 Build food comparison interface
    - Create FoodComparison component displaying presentedLeft and presentedRight foods
    - Implement primary selection buttons for each food item
    - Add expandable "More options" UI for tie/skip selections
    - Handle user selections by normalizing food IDs and determining result/winnerFoodId
    - Navigate to results after successful vote submission
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ] 5.4 Create results and feedback interface
    - Build Results component showing vote percentages with pairKey-based access control
    - Display nationality breakdown using current user.nationality via join queries
    - Implement comment input without nationality selector (nationality from user profile)
    - Show recent comments for the specific pairKey (only after user has voted)
    - Add "Continue" button for next comparison
    - Implement route-level access control to only show results after user votes on that pairKey
    - _Requirements: 3.1, 4.1, 4.2, 4.3, 4.4, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ] 5.5 Implement leaderboard display
    - Create Leaderboard component with sortable food rankings using TanStack Query
    - Display food photos, names, ELO scores, and positions
    - Implement real-time score updates with automatic refetching and proper loading states
    - Add responsive design for mobile and desktop viewing
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 6. Integrate authentication and user profile management
  - [ ] 6.1 Implement anonymous user flow with EnsureSession pattern
    - Set up EnsureSession component to wrap RouterProvider for automatic anonymous session creation
    - Handle session persistence across page reloads
    - Test anonymous user voting and commenting functionality
    - _Requirements: 6.1, 6.2, 6.4_

  - [ ] 6.2 Create user profile component for nationality management
    - Implement User Profile component with optional nationality setting
    - Add nationality update functionality through Better-auth API
    - Create POST /api/auth/update-nationality endpoint
    - Ensure nationality changes are reflected in future analytics
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6_

  - [ ] 6.3 Implement nationality-based analytics
    - Create analytics queries that join votes/comments with user.nationality
    - Display nationality breakdowns in results interface
    - Handle cases where users don't have nationality set
    - Document that nationality changes affect historical statistics
    - _Requirements: 3.4, 3.5, 4.2, 4.4, 5.3, 6.3, 6.5, 6.6_

- [ ] 7. Seed database with Korean food data
  - Create comprehensive list of popular Korean foods with descriptions
  - Source high-quality food images and host under public/ or external CDN for v1 (consider Cloudflare Images in Phase 2)
  - Implement database seeding script with initial ELO scores (1200)
  - Add food data validation and duplicate prevention
  - _Requirements: 7.1, 7.2_

- [ ] 8. Add error handling and validation
  - [ ] 8.1 Implement comprehensive input validation
    - Add Zod request validation for all API endpoints using normalized data structure
    - Implement content sanitization for comments (XSS prevention, max 280 characters)
    - Create proper error response formatting with standard HTTP codes (400/401/403/409)
    - _Requirements: All requirements - data integrity_

  - [ ] 8.2 Add error boundaries and user feedback
    - Implement React error boundaries for graceful failure handling
    - Add loading states and error messages throughout UI
    - Create retry mechanisms for failed network requests
    - Add user-friendly error messages for common scenarios
    - _Requirements: All requirements - user experience_

- [ ] 9. (Phase 2) Performance optimization and caching
  - Implement Cloudflare KV caching for leaderboard data with 30-60s TTL
  - Add Workers Cache API (caches.default) for API response caching
  - Design and implement cache invalidation strategy (leaderboard, stats) on vote mutations
  - Implement rate limiting using KV counters or Durable Objects
  - Consider Cloudflare Images for optimized image delivery
  - Add response compression and caching headers
  - _Requirements: Phase 2 - performance optimization for high traffic_

- [ ] 10. Deploy and configure production environment
  - Configure Cloudflare Workers deployment with static assets
  - Set up production D1 database and run migrations
  - Configure environment variables and secrets
  - Test full application functionality in production environment
  - _Requirements: All requirements - production deployment_