# Requirements Document

## Introduction

The Korean Food ELO Ranking System is a web application where users can view two Korean food items (with photos and names) and choose one, which updates each food's ELO rating. Users can participate anonymously and optionally write comments about their choices to share with other users. The system displays food rankings through a leaderboard.

## Requirements

### Requirement 1

**User Story:** As a user, I want to choose between two Korean food items with additional options available, so that I can express my preference accurately.

#### Acceptance Criteria

1. WHEN a user accesses the main page THEN the system SHALL display two different Korean food items
2. WHEN food items are displayed THEN the system SHALL show each food's photo and name together as primary selection options
3. WHEN food items are displayed THEN the system SHALL provide an expandable "More options" or similar UI element
4. WHEN the user expands additional options THEN the system SHALL show "Both are good" (tie) and "Skip/Don't know" options
5. WHEN a user clicks on one of the food items THEN the system SHALL record the selection as a win for that food
6. WHEN a user selects "Both are good" THEN the system SHALL record it as a tie between the foods
7. WHEN a user selects "Skip/Don't know" THEN the system SHALL record it as a skip without affecting ELO scores
8. WHEN a user completes any selection THEN the system SHALL update the ELO scores accordingly (except for skips)

### Requirement 2

**User Story:** As a user, I want to view the current rankings of foods, so that I can see which foods are most popular.

#### Acceptance Criteria

1. WHEN a user accesses the leaderboard page THEN the system SHALL display a list of foods sorted by ELO score
2. WHEN the leaderboard is displayed THEN the system SHALL show each food's name, photo, current ELO score, and rank
3. WHEN the leaderboard loads THEN the system SHALL reflect real-time updated scores

### Requirement 3

**User Story:** As an anonymous user, I want to write comments about my choices after making a selection and optionally share my nationality, so that I can share my cultural perspective without influencing others beforehand.

#### Acceptance Criteria

1. WHEN a user selects a food item THEN the system SHALL show the selection results and provide a comment input field
2. WHEN a user writes and submits a comment THEN the system SHALL store the comment anonymously with the selection data
3. WHEN a comment is submitted THEN the system SHALL make it publicly visible to other users who have made selections
4. WHEN nationality is set in user profile THEN the system SHALL include nationality context with comments and votes
5. WHEN a user does not provide nationality in profile THEN the system SHALL record selections and comments without nationality data

### Requirement 4

**User Story:** As a user, I want to view selection results and other people's comments with nationality information after making my choice, so that I can see diverse cultural perspectives without being biased beforehand.

#### Acceptance Criteria

1. WHEN a user completes a selection THEN the system SHALL display the current vote percentages for that food pairing
2. WHEN selection results are shown THEN the system SHALL display vote breakdown by nationality if available with minimum group size (N ≥ 5), smaller groups aggregated as 'Other'
3. WHEN selection results are shown THEN the system SHALL display recent comments related to that specific food comparison
4. WHEN comments are displayed THEN the system SHALL show which food was selected along with the comment content and nationality (if provided)
5. WHEN comments are displayed THEN the system SHALL show them anonymously without exposing user personal information beyond nationality
6. WHEN a user has not made a selection for a food pairing THEN the system SHALL NOT display results or comments for that pairing
7. WHEN nationality data is used THEN the system SHALL use ISO 3166-1 alpha-2 country codes with 'unknown' for unspecified

### Requirement 5

**User Story:** As a user, I want to see the results of my selection immediately after choosing, so that I can understand the impact of my choice and see related discussions with cultural context.

#### Acceptance Criteria

1. WHEN a user makes any selection (win/tie/skip) THEN the system SHALL immediately show a results screen with vote percentages
2. WHEN the results screen is displayed THEN the system SHALL show how many people chose each food in that specific pairing with skip votes excluded from percentage calculations
3. WHEN the results screen is displayed THEN the system SHALL show vote distribution by nationality if sufficient data is available
4. WHEN the results screen is displayed THEN the system SHALL show recent comments from other users who made selections on this pairing
5. WHEN the results screen is shown THEN the system SHALL provide a "Continue" or "Next Comparison" button to proceed
6. WHEN a user continues from the results screen THEN the system SHALL load a new food comparison

### Requirement 6

**User Story:** As a user, I want to optionally provide my nationality in my profile, so that my cultural background can add context to voting patterns and discussions.

#### Acceptance Criteria

1. WHEN a user accesses their profile or settings THEN the system SHALL provide an optional nationality field
2. WHEN nationality is provided in profile THEN the system SHALL use it for vote and comment analytics
3. WHEN nationality data is used for analytics THEN the system SHALL use the current user nationality from the profile
4. WHEN a user chooses not to provide nationality THEN the system SHALL allow full participation without this information
5. WHEN a user changes their nationality THEN the system SHALL use the updated nationality for future analytics
6. WHEN nationality is changed THEN historical statistics may reflect the updated value rather than historical snapshots

### Requirement 7

**User Story:** As a system administrator, I want to store and manage Korean food data in a database, so that ELO scores can be persistently updated and tracked.

#### Acceptance Criteria

1. WHEN the system initializes THEN the system SHALL seed the database with predefined Korean food data including names, images, and initial ELO scores
2. WHEN food data is stored THEN each food SHALL have a unique identifier, name, image URL, and current ELO score
3. WHEN ELO calculation is performed THEN the system SHALL use the standard ELO algorithm and persist the updated scores atomically with concurrency control
4. WHEN vote data is stored THEN the system SHALL use normalized pair keys to prevent duplicate entries for (A,B) vs (B,A) comparisons
5. WHEN concurrent votes occur THEN the system SHALL use optimistic locking with updated_at timestamps to prevent race conditions
6. WHEN the application starts THEN the system SHALL ensure database connectivity and data integrity
