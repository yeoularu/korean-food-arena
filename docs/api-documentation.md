# Korean Food Arena API Documentation

This document provides comprehensive documentation for the Korean Food Arena API, including the enhanced expanded comments functionality.

## Base URL

All API endpoints are prefixed with `/api`

## Authentication

The API uses Better-auth with anonymous sessions. All endpoints require authentication, but users are automatically assigned anonymous sessions on first visit.

### Headers

- `Content-Type: application/json` (for POST requests)
- `Cookie: better-auth.session_token=<token>` (automatically handled by browser)

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "ValidationError",
  "message": "Detailed error message",
  "code": 400,
  "details": {}
}
```

Common HTTP status codes:

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (no session)
- `403` - Forbidden (access denied, e.g., must vote before viewing results)
- `404` - Not Found
- `409` - Conflict (e.g., duplicate vote)
- `500` - Internal Server Error

## Food Endpoints

### Get Random Food Pair

Returns two random foods for comparison.

**Endpoint:** `GET /api/foods/random-pair`

**Response:**

```json
{
  "presentedLeft": {
    "id": "bibimbap",
    "name": "Bibimbap",
    "imageUrl": "/img/food/display/bibimbap.webp",
    "eloScore": 1200,
    "totalVotes": 150,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T12:30:00.000Z"
  },
  "presentedRight": {
    "id": "kimchi",
    "name": "Kimchi",
    "imageUrl": "/img/food/display/kimchi.webp",
    "eloScore": 1180,
    "totalVotes": 200,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T11:45:00.000Z"
  }
}
```

### Get Leaderboard

Returns all foods sorted by ELO score (highest first).

**Endpoint:** `GET /api/foods/leaderboard`

**Response:**

```json
[
  {
    "id": "korean-fried-chicken",
    "name": "Korean Fried Chicken",
    "imageUrl": "/img/food/display/korean-fried-chicken.webp",
    "eloScore": 1350,
    "totalVotes": 300,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T14:20:00.000Z"
  },
  {
    "id": "bulgogi",
    "name": "Bulgogi",
    "imageUrl": "/img/food/display/bulgogi.webp",
    "eloScore": 1320,
    "totalVotes": 280,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T13:15:00.000Z"
  }
]
```

## Vote Endpoints

### Create Vote

Records a vote and updates ELO scores.

**Endpoint:** `POST /api/votes`

**Request Body:**

```json
{
  "pairKey": "bibimbap_kimchi",
  "foodLowId": "bibimbap",
  "foodHighId": "kimchi",
  "presentedLeftId": "bibimbap",
  "presentedRightId": "kimchi",
  "result": "win",
  "winnerFoodId": "bibimbap"
}
```

**Request Fields:**

- `pairKey` (string): Normalized pair identifier (lower ID first)
- `foodLowId` (string): Food ID that comes first alphabetically
- `foodHighId` (string): Food ID that comes second alphabetically
- `presentedLeftId` (string): Food ID shown on the left side
- `presentedRightId` (string): Food ID shown on the right side
- `result` (string): Vote result - `"win"`, `"tie"`, or `"skip"`
- `winnerFoodId` (string, optional): Required if result is `"win"`

**Response:**

```json
{
  "vote": {
    "id": "vote-uuid",
    "pairKey": "bibimbap_kimchi",
    "foodLowId": "bibimbap",
    "foodHighId": "kimchi",
    "presentedLeftId": "bibimbap",
    "presentedRightId": "kimchi",
    "result": "win",
    "winnerFoodId": "bibimbap",
    "userId": "user-uuid",
    "createdAt": "2024-01-15T15:30:00.000Z"
  },
  "updatedScores": {
    "bibimbap": 1215,
    "kimchi": 1165
  },
  "voteStats": {
    // Vote statistics object (see Get Vote Stats response)
  }
}
```

### Get Vote Statistics

Returns voting statistics for a specific food pairing.

**Endpoint:** `GET /api/votes/stats/:pairKey`

**Access Control:** User must have voted on this pairing to view statistics.

**Response:**

```json
{
  "totalVotes": 45,
  "countsByFoodId": {
    "bibimbap": 28,
    "kimchi": 12
  },
  "tieCount": 5,
  "skipCount": 3,
  "percentageByFoodId": {
    "bibimbap": 66.7,
    "kimchi": 28.6
  },
  "tiePercentage": 11.9,
  "nationalityBreakdown": {
    "US": {
      "byFoodId": {
        "bibimbap": 15,
        "kimchi": 8
      },
      "tiePercentage": 12.5
    },
    "KR": {
      "byFoodId": {
        "bibimbap": 10,
        "kimchi": 3
      },
      "tiePercentage": 10.0
    },
    "Other": {
      "byFoodId": {
        "bibimbap": 3,
        "kimchi": 1
      },
      "tiePercentage": 15.0
    }
  },
  "foodNamesById": {
    "bibimbap": "Bibimbap",
    "kimchi": "Kimchi"
  },
  "countryCodeStandard": "ISO-3166-1-alpha-2",
  "userVoteForComment": {
    "result": "win",
    "winnerFoodId": "bibimbap"
  }
}
```

## Comment Endpoints

The Korean Food Arena provides both legacy and enhanced comment endpoints. The enhanced expanded comments functionality allows users to see comments from other pairings involving the same foods, providing richer context and more diverse opinions.

### Create Comment

Creates a new comment for a food pairing.

**Endpoint:** `POST /api/comments`

**Access Control:** User must have voted on this pairing to create comments.

**Request Body:**

```json
{
  "pairKey": "bibimbap_kimchi",
  "result": "win",
  "winnerFoodId": "bibimbap",
  "content": "Bibimbap has such a great balance of flavors and textures!"
}
```

**Request Fields:**

- `pairKey` (string): The food pairing identifier
- `result` (string): Vote result - `"win"` or `"tie"`
- `winnerFoodId` (string, optional): Required if result is `"win"`
- `content` (string): Comment text (1-500 characters, sanitized for XSS)

**Response:**

```json
{
  "id": "comment-uuid",
  "pairKey": "bibimbap_kimchi",
  "result": "win",
  "winnerFoodId": "bibimbap",
  "content": "Bibimbap has such a great balance of flavors and textures!",
  "createdAt": "2024-01-15T15:45:00.000Z"
}
```

### Get Comments (Legacy)

Returns recent comments for a specific food pairing. This endpoint is maintained for backward compatibility.

**Note:** For new implementations, consider using the enhanced `/api/comments/:pairKey/expanded` endpoint which provides better context and user experience.

**Endpoint:** `GET /api/comments/:pairKey`

**Access Control:** User must have voted on this pairing to view comments.

**Query Parameters:**

- `limit` (number, optional): Maximum number of comments (1-50, default: 20)
- `cursor` (string, optional): Pagination cursor (ISO timestamp)

**Response:**

```json
[
  {
    "id": "comment-uuid-1",
    "pairKey": "bibimbap_kimchi",
    "result": "win",
    "winnerFoodId": "bibimbap",
    "content": "Bibimbap has such a great balance of flavors and textures!",
    "createdAt": "2024-01-15T15:45:00.000Z",
    "nationality": "US"
  },
  {
    "id": "comment-uuid-2",
    "pairKey": "bibimbap_kimchi",
    "result": "tie",
    "content": "Both are amazing in their own way!",
    "createdAt": "2024-01-15T14:30:00.000Z",
    "nationality": "Other"
  }
]
```

### Get Expanded Comments (Enhanced)

Returns expanded comments for a food pairing, including comments from other pairings involving either food.

**Endpoint:** `GET /api/comments/:pairKey/expanded`

**Access Control:** User must have voted on this pairing to view comments.

**Query Parameters:**

- `foodId1` (string, required): First food ID in the pairing
- `foodId2` (string, required): Second food ID in the pairing
- `currentPairingLimit` (number, optional): Max current pairing comments (1-20, default: 10)
- `expandedLimit` (number, optional): Max expanded comments (1-30, default: 10)
- `includeExpanded` (boolean, optional): Whether to include expanded comments (default: true)
- `cursor` (string, optional): Pagination cursor (ISO timestamp)

**Example Request:**

```
GET /api/comments/bibimbap_kimchi/expanded?foodId1=bibimbap&foodId2=kimchi&currentPairingLimit=5&expandedLimit=15
```

**Response:**

```json
{
  "currentPairingComments": [
    {
      "id": "comment-uuid-1",
      "pairKey": "bibimbap_kimchi",
      "result": "win",
      "winnerFoodId": "bibimbap",
      "content": "Bibimbap has such a great balance of flavors and textures!",
      "createdAt": "2024-01-15T15:45:00.000Z",
      "nationality": "US",
      "isCurrentPairing": true,
      "otherFoodId": "kimchi",
      "otherFoodName": "Kimchi"
    }
  ],
  "expandedComments": [
    {
      "id": "comment-uuid-3",
      "pairKey": "bibimbap_bulgogi",
      "result": "win",
      "winnerFoodId": "bibimbap",
      "content": "Bibimbap is so versatile and healthy!",
      "createdAt": "2024-01-15T12:20:00.000Z",
      "nationality": "KR",
      "isCurrentPairing": false,
      "otherFoodId": "bulgogi",
      "otherFoodName": "Bulgogi"
    },
    {
      "id": "comment-uuid-4",
      "pairKey": "galbi_kimchi",
      "result": "win",
      "winnerFoodId": "kimchi",
      "content": "Kimchi is the perfect side dish for everything!",
      "createdAt": "2024-01-15T11:15:00.000Z",
      "nationality": "Other",
      "isCurrentPairing": false,
      "otherFoodId": "galbi",
      "otherFoodName": "Galbi"
    }
  ],
  "totalCount": 2,
  "hasMore": false,
  "cursor": "2024-01-15T11:15:00.000Z"
}
```

**Enhanced Comment Fields:**

- `isCurrentPairing` (boolean): Whether this comment is from the exact current pairing
- `otherFoodId` (string): The other food ID in the commenter's pairing
- `otherFoodName` (string): Display name of the other food for context

**Response Structure:**

- `currentPairingComments`: Comments from the exact current pairing (shown first)
- `expandedComments`: Comments from other pairings involving either food
- `totalCount`: Total number of comments returned
- `hasMore`: Whether more comments are available for pagination
- `cursor`: Timestamp cursor for next page (if hasMore is true)

## User Endpoints

### Update Nationality

Updates the current user's nationality for demographic analytics.

**Endpoint:** `POST /api/user/update-nationality`

**Request Body:**

```json
{
  "nationality": "US"
}
```

**Request Fields:**

- `nationality` (string, optional): ISO 3166-1 alpha-2 country code or null

**Response:**

```json
{
  "user": {
    "id": "user-uuid",
    "email": "anonymous@example.com",
    "emailVerified": false,
    "name": "Anonymous User",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T16:00:00.000Z",
    "image": null,
    "isAnonymous": true,
    "nationality": "US"
  },
  "message": "Nationality updated successfully"
}
```

## Privacy Protection

### Nationality Privacy

Comments include nationality information for demographic analysis, but privacy is protected:

- **Minimum Group Size:** Nationalities with fewer than 5 users are grouped as "Other"
- **Consistent Protection:** Privacy protection is applied consistently across current pairing and expanded comments
- **Anonymous by Default:** Users can optionally set nationality; default is "unknown"

### Access Control

- **Vote Requirement:** Users must vote on a pairing before viewing results or comments
- **Session-Based:** All access is tied to Better-auth anonymous sessions
- **No Personal Data:** No personally identifiable information is stored or exposed

## Performance Considerations

### Query Optimization

- **Database Indexes:** Optimized indexes for comment queries by winner_food_id and created_at
- **Response Limits:** Configurable limits prevent large responses
- **Pagination:** Cursor-based pagination for large comment sets

### Caching Headers

Expanded comment responses include performance headers for monitoring:

- `X-Query-Time`: Query execution time in milliseconds
- `X-Response-Size`: Response size in bytes
- `X-Optimized`: Whether query limits were optimized

### Rate Limiting

While not currently implemented, consider implementing rate limiting for:

- Vote creation (prevent spam voting)
- Comment creation (prevent spam comments)
- API endpoint access (prevent abuse)

## Development vs Production

### Development Features

- Performance metadata included in response body
- Detailed error messages and stack traces
- Additional logging and debugging information

### Production Optimizations

- Performance metadata only in headers
- Sanitized error messages
- Optimized query limits based on load
- Enhanced security headers

## Migration and Backward Compatibility

### Legacy Support

- Original `/api/comments/:pairKey` endpoint maintained for backward compatibility
- New `/api/comments/:pairKey/expanded` endpoint provides enhanced functionality
- All existing client code continues to work without changes

### Type Safety

All endpoints use Zod schemas for request/response validation:

- `VoteRequestSchema` - Vote creation validation
- `CommentRequestSchema` - Comment creation validation
- `ExpandedCommentsQuerySchema` - Expanded comments query validation
- `PaginationQuerySchema` - Pagination parameter validation

## Error Handling

### Common Error Scenarios

1. **Unauthorized Access (403)**
   - User hasn't voted on pairing before viewing results/comments
   - Solution: Vote on the pairing first

2. **Validation Errors (400)**
   - Invalid pairKey format
   - Missing required fields
   - Invalid parameter values
   - Solution: Check request format and required fields

3. **Duplicate Vote (409)**
   - User already voted on this pairing
   - Solution: Each user can only vote once per pairing

4. **Not Found (404)**
   - Invalid food IDs
   - Non-existent pairing
   - Solution: Use valid food IDs from leaderboard endpoint

### Error Response Format

```json
{
  "error": "ValidationError",
  "message": "Food IDs do not match the provided pair key",
  "code": 400,
  "details": {
    "pairKey": "bibimbap_kimchi",
    "providedIds": ["bibimbap", "bulgogi"],
    "expectedIds": ["bibimbap", "kimchi"]
  }
}
```
