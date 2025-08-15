# Implementation Plan

- [ ] 1. Set up project foundation and dependencies

  - Initialize Cloudflare Workers project with Hono framework
  - Install and configure TypeScript, Drizzle ORM, and Better-auth
  - Set up project structure with proper folder organization
  - Configure build and development scripts
  - _Requirements: 7.4_

- [ ] 2. Configure database and authentication system

  - [ ] 2.1 Set up Cloudflare D1 database connection

    - Create D1 database instance and configure connection
    - Set up Drizzle ORM with D1 adapter configuration
    - Create database connection utilities and error handling
    - _Requirements: 7.1, 7.4_

  - [ ] 2.2 Implement Better-auth configuration with anonymous plugin

    - Configure Better-auth with Drizzle adapter for D1
    - Set up anonymous plugin with nationality support in user additionalFields
    - Create auth configuration with proper session management
    - Test anonymous user creation and session handling
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ] 2.3 Create custom database schema for foods, votes, and comments
    - Define Drizzle schema for foods table with ELO scoring
    - Define votes table with foreign key references to foods and users
    - Define comments table with content and user relationships
    - Add composite unique index on votes table (user_id, food1_id, food2_id) to prevent duplicate voting
    - Generate and apply database migrations using Better-auth CLI
    - _Requirements: 7.1, 7.2, 7.3, 4.6_

- [ ] 3. Implement core ELO calculation system

  - [ ] 3.1 Create ELO calculation service

    - Implement standard ELO algorithm with K-factor of 32
    - Handle win/loss/tie scenarios for rating updates
    - Create utility functions for expected score calculations
    - Write comprehensive unit tests for ELO calculations
    - _Requirements: 1.8, 7.3_

  - [ ] 3.2 Implement vote processing with ELO updates
    - Create vote recording service with database transactions
    - Integrate ELO calculation with vote processing
    - Handle skip votes (no ELO impact) vs scoring votes
    - Ensure atomic updates of food ratings and vote records
    - _Requirements: 1.5, 1.6, 1.7, 1.8_

- [ ] 4. Build API endpoints with Hono framework

  - [ ] 4.1 Create food management endpoints

    - Implement GET /api/foods/random-pair for food comparisons
    - Implement GET /api/foods/leaderboard for rankings display
    - Add proper error handling and response formatting
    - Include data validation and sanitization
    - _Requirements: 1.1, 2.1, 2.2_

  - [ ] 4.2 Create voting system endpoints

    - Implement POST /api/votes for recording user selections with duplicate prevention
    - Implement GET /api/votes/stats/:food1Id/:food2Id for vote statistics with access control
    - Add nationality-based vote breakdown calculations
    - Integrate with Better-auth session management
    - Add composite unique constraint checking to prevent duplicate votes on same pairing
    - _Requirements: 1.5, 1.6, 1.7, 1.8, 4.1, 4.2, 4.6, 5.1, 5.2, 5.3_

  - [ ] 4.3 Create comments system endpoints
    - Implement POST /api/comments for comment creation
    - Implement GET /api/comments/:food1Id/:food2Id for comment retrieval with access control
    - Add content validation and sanitization for comments
    - Ensure proper user association through Better-auth sessions
    - Add access control to verify user has voted on pairing before showing comments
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
    - Implement mutation hooks for voting and comments with optimistic updates
    - Set up query invalidation and refetch strategies
    - Add error handling and loading states for all queries
    - _Requirements: 1.1, 2.3, 4.1, 4.2, 5.1, 5.2_

  - [ ] 5.3 Build food comparison interface

    - Create FoodComparison component with two food display using TanStack Query
    - Implement primary selection buttons for each food item
    - Add expandable "More options" UI for tie/skip selections
    - Handle user selections with optimistic updates and navigation to results
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ] 5.4 Create results and feedback interface

    - Build Results component showing vote percentages with access control
    - Display nationality breakdown when sufficient data available
    - Implement comment input with nationality selector
    - Show recent comments for the specific food pairing (only after user has voted)
    - Add "Continue" button for next comparison
    - Implement access control to only show results after user votes on that pairing
    - _Requirements: 3.1, 4.1, 4.2, 4.3, 4.4, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ] 5.5 Implement leaderboard display
    - Create Leaderboard component with sortable food rankings using TanStack Query
    - Display food photos, names, ELO scores, and positions
    - Implement real-time score updates with automatic refetching and proper loading states
    - Add responsive design for mobile and desktop viewing
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 6. Integrate authentication and session management

  - [ ] 6.1 Implement anonymous user flow

    - Set up automatic anonymous session creation on first visit
    - Handle nationality selection and session updates
    - Ensure proper session persistence across page reloads
    - Test anonymous user voting and commenting functionality
    - Implement first-time user nationality prompt after initial vote/comment
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ] 6.2 Add nationality tracking and analytics
    - Implement nationality selector UI component
    - Add nationality data to vote and comment submissions
    - Create analytics for nationality-based voting patterns
    - Display nationality breakdowns in results interface
    - _Requirements: 3.4, 3.5, 4.2, 4.4, 5.3, 6.2, 6.3_

- [ ] 7. Seed database with Korean food data

  - Create comprehensive list of popular Korean foods with descriptions
  - Source high-quality food images and optimize for web delivery
  - Implement database seeding script with initial ELO scores
  - Add food data validation and duplicate prevention
  - _Requirements: 7.1, 7.2_

- [ ] 8. Add error handling and validation

  - [ ] 8.1 Implement comprehensive input validation

    - Add request validation for all API endpoints
    - Implement content sanitization for comments
    - Add rate limiting to prevent abuse
    - Create proper error response formatting
    - _Requirements: All requirements - data integrity_

  - [ ] 8.2 Add error boundaries and user feedback
    - Implement React error boundaries for graceful failure handling
    - Add loading states and error messages throughout UI
    - Create retry mechanisms for failed network requests
    - Add user-friendly error messages for common scenarios
    - _Requirements: All requirements - user experience_

- [ ] 9. Optimize performance and add caching

  - Implement Cloudflare KV caching for leaderboard data
  - Add image optimization and CDN configuration
  - Optimize database queries with proper indexing
  - Add response compression and caching headers
  - _Requirements: 2.3 - real-time updates, performance optimization_

- [ ] 10. Deploy and configure production environment
  - Configure Cloudflare Workers deployment with static assets
  - Set up production D1 database and run migrations
  - Configure environment variables and secrets
  - Test full application functionality in production environment
  - _Requirements: All requirements - production deployment_
