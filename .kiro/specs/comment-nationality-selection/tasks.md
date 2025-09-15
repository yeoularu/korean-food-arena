# Implementation Plan

- [x] 1. Create core nationality infrastructure
  - Create expanded country list with flag emoji mappings
  - Implement utility functions for country code to flag conversion
  - Add comprehensive country data with ISO codes and Unicode flags
  - _Requirements: 3.2, 3.3, 3.5_

- [x] 2. Implement FlagDisplay component
  - Create reusable component for displaying country flags with optional names
  - Handle fallback cases for missing or invalid country codes
  - Support different sizes (sm, md, lg) for various use cases
  - Add proper accessibility attributes and ARIA labels
  - _Requirements: 2.1, 2.2_

- [x] 3. Create CountryDropdown component
  - Implement searchable dropdown with country list and flag emojis
  - Add keyboard navigation support for accessibility
  - Handle selection state and change events
  - Include "Prefer not to say" option at the top of the list
  - _Requirements: 3.1, 3.3, 3.4, 4.3_

- [x] 4. Build NationalitySelector component
  - Create composite component combining dropdown and current nationality display
  - Support both compact (comment creation) and full (profile) modes
  - Handle nationality change events and state management
  - Integrate with existing session management hooks
  - _Requirements: 1.1, 1.3, 4.1, 4.2_

- [x] 5. Enhance CommentCreation with nationality selection
  - Add NationalitySelector to comment creation form
  - Integrate nationality₩ updates with comment submission flow
  - Maintain existing vote selection and validation logic
  - Handle nationality update errors gracefully
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 4.1_

- [x] 6. Update CommentCard to display flags
  - Replace text-only nationality display with flag and country name
  - Maintain existing privacy rules for nationality aggregation
  - Preserve existing comment layout and accessibility features
  - Handle cases where nationality is unknown or "Other"
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 7. Enhance UserProfile with flag display
  - Update existing nationality dropdown to use new CountryDropdown component
  - Add flag display to show current nationality selection
  - Maintain existing nationality update functionality
  - Ensure consistency with comment creation interface
  - _Requirements: 4.2, 4.3, 4.4_

- [x] 8. Update Results nationality breakdown with flags
  - Add flag emojis to nationality breakdown section
  - Maintain existing privacy aggregation logic (minimum 5 users)
  - Preserve existing results display structure and accessibility
  - Handle "Other" and "Not specified" categories appropriately
  - _Requirements: 2.3, 2.4_

- [x] 9. Add comprehensive unit tests
  - Write tests for FlagDisplay component with various country codes
  - Test CountryDropdown functionality including search and selection
  - Test NationalitySelector component behavior and state management
  - Verify error handling and fallback scenarios
  - _Requirements: All requirements - testing coverage_

- [x] 10. Add integration tests for nationality flow
  - Test comment creation with nationality selection
  - Verify nationality updates propagate to user profile
  - Test consistency between comment creation and profile interfaces
  - Validate error handling for nationality update failures
  - _Requirements: 1.2, 4.1, 4.2, 4.4_

- [x] 11. Add end-to-end tests for complete user journey
  - Test setting nationality in comment creation and seeing it in profile
  - Verify comments display with correct flags after nationality selection
  - Test nationality breakdown in results with flag display
  - Validate accessibility and keyboard navigation throughout flow
  - _Requirements: All requirements - complete user experience_

- [x] 12. Performance optimization and polish
  - Optimize flag emoji rendering for mobile devices
  - Implement lazy loading for large country dropdown list
  - Add proper loading states for nationality updates
  - Ensure smooth user experience across all devices
  - _Requirements: 3.4_