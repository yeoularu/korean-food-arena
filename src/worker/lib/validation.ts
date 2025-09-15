import { z } from 'zod'

// Common validation patterns
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PAIR_KEY_REGEX = /^[a-zA-Z0-9_-]+_[a-zA-Z0-9_-]+$/

// ISO 3166-1 alpha-2 country codes (common ones for validation)
/* prettier-ignore */
const COUNTRY_CODES = [
  'AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ','BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE','EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM','HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM','JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW','SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI','VN','VU','WF','WS','YE','YT','ZA','ZM','ZW','unknown',
] as const

// Base schemas
export const IdSchema = z
  .string()
  .min(1, 'ID cannot be empty')
  .max(255, 'ID too long')

export const UuidSchema = z.string().regex(UUID_REGEX, 'Invalid UUID format')

export const PairKeySchema = z
  .string()
  .min(3, 'Pair key too short')
  .max(511, 'Pair key too long')
  .regex(PAIR_KEY_REGEX, 'Invalid pair key format (must be foodId1_foodId2)')

export const CountryCodeSchema = z
  .enum(COUNTRY_CODES)
  .or(z.literal('unknown'))
  .optional()

// Content validation
export const CommentContentSchema = z
  .string()
  .min(1, 'Comment cannot be empty')
  .max(280, 'Comment must be 280 characters or less')
  .refine(
    (content) => content.trim().length > 0,
    'Comment cannot be only whitespace',
  )

// Vote validation schemas
export const VoteResultSchema = z.enum(['win', 'tie', 'skip'])

export const VoteRequestSchema = z
  .object({
    pairKey: PairKeySchema,
    foodLowId: IdSchema,
    foodHighId: IdSchema,
    presentedLeftId: IdSchema,
    presentedRightId: IdSchema,
    result: VoteResultSchema,
    winnerFoodId: IdSchema.optional(),
  })
  .refine(
    (data) => {
      // If result is 'win', winnerFoodId must be provided
      if (data.result === 'win' && !data.winnerFoodId) {
        return false
      }
      // If result is not 'win', winnerFoodId should not be provided
      if (data.result !== 'win' && data.winnerFoodId) {
        return false
      }
      return true
    },
    {
      message:
        'Winner food ID is required for win results and should not be provided for tie/skip results',
      path: ['winnerFoodId'],
    },
  )
  .refine(
    (data) => {
      // Ensure foodLowId and foodHighId are different
      if (data.foodLowId === data.foodHighId) {
        return false
      }
      return true
    },
    {
      message: 'Food IDs must be different',
      path: ['foodHighId'],
    },
  )
  .refine(
    (data) => {
      // Ensure presentedLeftId and presentedRightId are different
      if (data.presentedLeftId === data.presentedRightId) {
        return false
      }
      return true
    },
    {
      message: 'Presented food IDs must be different',
      path: ['presentedRightId'],
    },
  )
  .refine(
    (data) => {
      // Ensure presented IDs match the normalized IDs
      const presentedIds = [data.presentedLeftId, data.presentedRightId].sort()
      const normalizedIds = [data.foodLowId, data.foodHighId].sort()
      return (
        presentedIds[0] === normalizedIds[0] &&
        presentedIds[1] === normalizedIds[1]
      )
    },
    {
      message: 'Presented food IDs must match the normalized food IDs',
      path: ['presentedLeftId'],
    },
  )
  .refine(
    (data) => {
      // If winnerFoodId is provided, it must be one of the food IDs
      if (
        data.winnerFoodId &&
        data.winnerFoodId !== data.foodLowId &&
        data.winnerFoodId !== data.foodHighId
      ) {
        return false
      }
      return true
    },
    {
      message: 'Winner food ID must be one of the compared foods',
      path: ['winnerFoodId'],
    },
  )

// Comment validation schemas
export const CommentResultSchema = z.enum(['win', 'tie'])

export const CommentRequestSchema = z
  .object({
    pairKey: PairKeySchema,
    result: CommentResultSchema,
    winnerFoodId: IdSchema.optional(),
    content: CommentContentSchema,
  })
  .refine(
    (data) => {
      // If result is 'win', winnerFoodId must be provided
      if (data.result === 'win' && !data.winnerFoodId) {
        return false
      }
      // If result is 'tie', winnerFoodId should not be provided
      if (data.result === 'tie' && data.winnerFoodId) {
        return false
      }
      return true
    },
    {
      message:
        'Winner food ID is required for win results and should not be provided for tie results',
      path: ['winnerFoodId'],
    },
  )

// User profile validation
export const UpdateNationalitySchema = z.object({
  nationality: CountryCodeSchema,
})

// Query parameter validation
export const PaginationQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .refine((val) => val >= 1 && val <= 100, 'Limit must be between 1 and 100'),
  cursor: z.string().optional(),
})

export const ExpandedCommentsQuerySchema = z.object({
  currentPairingLimit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 8)) // Optimized default
    .refine(
      (val) => val >= 1 && val <= 15, // Reduced maximum for performance
      'Current pairing limit must be between 1 and 15',
    ),
  expandedLimit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 12)) // Optimized default
    .refine(
      (val) => val >= 1 && val <= 25, // Reduced maximum for performance
      'Expanded limit must be between 1 and 25',
    ),
  includeExpanded: z
    .string()
    .optional()
    .default('true')
    .transform((val) => val !== 'false'),
  cursor: z.string().optional(),
})

// Content sanitization function
export function sanitizeContent(content: string): string {
  return content
    .replace(/&/g, '&amp;') // Must be first to avoid double-encoding
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
}

// Validation error formatter
export function formatValidationError(error: z.ZodError) {
  return {
    error: 'Validation Error',
    message: 'Invalid request data',
    code: 400,
    details: error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    })),
  }
}

// Type exports for use in other files
export type VoteRequest = z.infer<typeof VoteRequestSchema>
export type CommentRequest = z.infer<typeof CommentRequestSchema>
export type UpdateNationalityRequest = z.infer<typeof UpdateNationalitySchema>
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>
export type ExpandedCommentsQuery = z.infer<typeof ExpandedCommentsQuerySchema>
