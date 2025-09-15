# Implementation Plan

- [x] 1. Create enhanced comment types and interfaces
  - Define EnhancedComment interface with additional context fields (isCurrentPairing, otherFoodId, otherFoodName)
  - Define ExpandedCommentsResponse interface for structured API responses
  - Update existing Comment type imports to support backward compatibility
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2. Implement database query functions for expanded comments
  - Create getExpandedComments function with two-tier query approach (current pairing + expanded)
  - Implement SQL logic to extract otherFoodId from pairKey using string manipulation
  - Add proper error handling and validation for food ID extraction
  - Write unit tests for query logic with various pairKey formats
  - _Requirements: 1.1, 1.2, 4.1, 4.5_

- [x] 3. Add database index for expanded comment performance
  - Create composite index on comment table: (winner_food_id, created_at DESC)
  - Write migration script to add the new index
  - Test query performance with the new index using sample data
  - _Requirements: 4.1, 3.4_

- [x] 4. Create new API endpoint for expanded comments
  - Implement GET /api/comments/:pairKey/expanded endpoint in Hono router
  - Add request validation using Zod schema for query parameters
  - Integrate getExpandedComments function with proper error handling
  - Maintain existing access control (user must have voted on current pairing)
  - Apply nationality privacy protection across all returned comments
  - _Requirements: 1.6, 4.2, 4.3, 4.4_

- [x] 5. Implement nationality privacy protection for expanded comments
  - Modify applyNationalityPrivacy function to handle mixed comment types
  - Ensure consistent privacy protection across current pairing and expanded comments
  - Count nationality occurrences across all comments in the response
  - Write unit tests for privacy protection with various nationality distributions
  - _Requirements: 1.5, 4.3_

- [x] 6. Create enhanced API client methods
  - Add getExpandedComments method to api-client.ts
  - Implement proper TypeScript typing for request/response
  - Add error handling and network retry logic
  - Maintain backward compatibility with existing getComments method
  - _Requirements: 3.1, 3.4_

- [x] 7. Implement TanStack Query hooks for expanded comments
  - Create useExpandedComments hook with proper query key structure
  - Implement cache invalidation strategy for comment mutations
  - Add network-aware query options for offline support
  - Write unit tests for query hook behavior and cache management
  - _Requirements: 3.1, 3.3, 3.4_

- [x] 8. Create EnhancedComment component with context display
  - Build CommentCard component that shows pairing context when needed
  - Display otherFoodName for expanded comments with clear visual distinction
  - Show vote result (win/tie) and nationality information
  - Add proper accessibility attributes and responsive design
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 9. Build ExpandedComments container component
  - Create component that displays current pairing comments first, then expanded comments
  - Implement section headers to distinguish between comment types
  - Add loading states and error handling with retry functionality
  - Implement "Load more" functionality for pagination
  - _Requirements: 2.5, 2.6, 3.2, 3.5, 3.6_

- [x] 10. Update Results component to use expanded comments
  - Replace existing comment display with new ExpandedComments component
  - Pass required props (pairKey, foodId1, foodId2) from vote results
  - Maintain existing comment creation functionality
  - Ensure smooth integration with existing Results page layout
  - _Requirements: 1.1, 1.2, 3.1_

- [x] 11. Implement comment creation mutation updates
  - Update useCreateCommentMutation to invalidate expanded comment caches
  - Add selective cache invalidation for comments involving specific foods
  - Ensure new comments appear immediately in appropriate sections
  - Write integration tests for comment creation and cache updates
  - _Requirements: 3.1, 4.6_

- [x] 12. Add comprehensive error handling and loading states
  - Implement error boundaries for comment-related components
  - Add proper loading spinners and skeleton states
  - Create user-friendly error messages with retry options
  - Handle edge cases (no comments, network failures, invalid data)
  - _Requirements: 3.4, 4.5_

- [x] 13. Write integration tests for expanded comment system
  - Test complete flow from voting to viewing expanded comments
  - Verify access control (user must vote before viewing comments)
  - Test nationality privacy protection across comment types
  - Verify proper sorting and display of current vs expanded comments
  - _Requirements: 1.6, 2.5, 2.6, 4.2, 4.3_

- [x] 14. Add performance monitoring and optimization
  - Implement query performance logging for expanded comment queries
  - Add response size monitoring and optimization
  - Test with large datasets to ensure acceptable performance
  - Optimize query limits and pagination for best user experience
  - _Requirements: 3.4, 4.1_

- [x] 15. Update API documentation and type exports
  - Document new expanded comments endpoint with request/response examples
  - Export new TypeScript interfaces from appropriate modules
  - Update existing API documentation to mention expanded functionality
  - Ensure proper type safety across frontend and backend
  - _Requirements: 4.6_