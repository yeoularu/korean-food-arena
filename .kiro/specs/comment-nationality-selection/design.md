# Design Document

## Overview

This feature enhances the comment creation experience by integrating nationality selection directly into the comment interface, eliminating the need for users to navigate to their profile page. It also improves the visual representation of nationality information throughout the application by adding country flag emojis and expanding the available country options.

The design builds upon the existing Better-auth session management and comment system, extending the current nationality functionality to be more accessible and visually appealing.

## Architecture

### Component Architecture

```
CommentCreation (Enhanced)
├── NationalitySelector (New)
│   ├── CountryDropdown (New)
│   └── FlagDisplay (New)
├── Existing comment form elements
└── Existing vote selection

CommentCard (Enhanced)
├── Existing comment display
└── NationalityDisplay (Enhanced)
    └── FlagDisplay (New)

UserProfile (Enhanced)
├── Existing profile elements
└── CountryDropdown (Enhanced with flags)

Results (Enhanced)
└── NationalityBreakdown (Enhanced with flags)
```

### Data Flow

1. **Comment Creation Flow**:
   - User opens comment creation interface
   - System loads current nationality from session
   - User can modify nationality via dropdown
   - On comment submission, nationality is updated in user profile
   - Comment is saved with current nationality context

2. **Nationality Update Flow**:
   - User selects nationality in comment creation or profile
   - System calls existing `updateNationality` mutation
   - Session is updated with new nationality
   - All subsequent comments use updated nationality

## Components and Interfaces

### New Components

#### NationalitySelector
```typescript
interface NationalitySelectorProps {
  currentNationality?: string
  onNationalityChange: (nationality: string | undefined) => void
  disabled?: boolean
  showLabel?: boolean
  compact?: boolean
}
```

**Responsibilities**:
- Display current nationality with flag
- Provide dropdown for nationality selection
- Handle nationality changes
- Support both compact (comment creation) and full (profile) modes

#### CountryDropdown
```typescript
interface CountryDropdownProps {
  value?: string
  onChange: (value: string | undefined) => void
  disabled?: boolean
  showFlags?: boolean
  placeholder?: string
}
```

**Responsibilities**:
- Render searchable/scrollable country list
- Display country names with flag emojis
- Handle selection changes
- Support keyboard navigation

#### FlagDisplay
```typescript
interface FlagDisplayProps {
  countryCode?: string
  showName?: boolean
  size?: 'sm' | 'md' | 'lg'
}
```

**Responsibilities**:
- Convert country codes to flag emojis
- Handle fallback for unknown countries
- Provide consistent flag sizing

### Enhanced Components

#### CommentCreation (Enhanced)
- Add nationality selector above comment text area
- Integrate with existing form validation
- Update nationality on form submission
- Maintain existing vote selection and comment functionality

#### CommentCard (Enhanced)
- Replace text-only nationality display with flag + name
- Maintain existing privacy rules (show "Other" for <5 users)
- Preserve existing comment layout and functionality

#### UserProfile (Enhanced)
- Replace existing dropdown with enhanced CountryDropdown
- Add flag display to current nationality
- Maintain existing update functionality

#### Results (Enhanced)
- Add flag emojis to nationality breakdown section
- Maintain existing privacy aggregation logic
- Preserve existing results display structure

## Data Models

### Extended Country List
```typescript
interface Country {
  code: string // ISO 3166-1 alpha-2
  name: string
  flag: string // Unicode flag emoji
}
```

**Expanded Country Options** (50+ countries):
- All existing countries from current COUNTRY_OPTIONS
- Additional major countries from each continent:
  - Asia: Indonesia, Pakistan, Bangladesh, Russia, Turkey, etc.
  - Europe: Netherlands, Poland, Sweden, Norway, etc.
  - Americas: Argentina, Colombia, Chile, Peru, etc.
  - Africa: Nigeria, South Africa, Egypt, Kenya, etc.
  - Oceania: New Zealand, Fiji, etc.

### Flag Emoji Mapping
```typescript
const FLAG_EMOJIS: Record<string, string> = {
  'US': '🇺🇸',
  'KR': '🇰🇷',
  'JP': '🇯🇵',
  // ... comprehensive mapping for all supported countries
}
```

### No Database Schema Changes
- Existing `user.nationality` field supports the enhanced functionality
- No migration required
- Backward compatible with existing nationality data

## Error Handling

### Nationality Selection Errors
- **Network failure during update**: Show retry option, maintain local state
- **Invalid country code**: Fallback to "unknown" with user notification
- **Session timeout**: Redirect to refresh session

### Flag Display Errors
- **Missing flag emoji**: Show country name only
- **Invalid country code**: Show generic globe emoji (🌍)
- **Rendering issues**: Graceful degradation to text-only display

### Comment Creation Errors
- **Nationality update failure**: Allow comment submission, show warning
- **Validation errors**: Highlight nationality field if required
- **Concurrent updates**: Refresh nationality state on conflict

## Testing Strategy

### Unit Tests

#### NationalitySelector Component
- Renders current nationality with flag
- Handles nationality changes correctly
- Supports disabled state
- Validates country code inputs

#### CountryDropdown Component
- Displays all countries with flags
- Handles search/filter functionality
- Supports keyboard navigation
- Manages selection state correctly

#### FlagDisplay Component
- Renders correct flag emojis for country codes
- Handles fallback for invalid codes
- Supports different sizes
- Graceful degradation for missing emojis

### Integration Tests

#### Comment Creation Flow
- Nationality selection updates user profile
- Comment submission includes nationality context
- Error handling for nationality update failures
- Consistency between comment and profile nationality

#### Results Display
- Flag emojis appear in nationality breakdowns
- Privacy rules maintained with flag display
- Consistent flag rendering across components

### End-to-End Tests

#### Complete User Journey
- User sets nationality in comment creation
- Nationality persists across sessions
- Comments display with correct flags
- Profile page reflects updated nationality
- Results page shows flags in breakdowns

### Performance Tests

#### Flag Rendering Performance
- Large country list rendering time
- Flag emoji display performance
- Memory usage with expanded country list
- Mobile device compatibility

## Implementation Phases

### Phase 1: Core Infrastructure
1. Create expanded country list with flag mappings
2. Implement FlagDisplay component
3. Create CountryDropdown component
4. Add unit tests for new components

### Phase 2: Comment Integration
1. Enhance CommentCreation with NationalitySelector
2. Update CommentCard to display flags
3. Integrate nationality update with comment submission
4. Add integration tests

### Phase 3: Profile and Results Enhancement
1. Enhance UserProfile with flag display
2. Update Results nationality breakdown with flags
3. Ensure consistency across all nationality displays
4. Add end-to-end tests

### Phase 4: Polish and Optimization
1. Performance optimization for mobile devices
2. Accessibility improvements
3. Error handling refinements
4. User experience polish