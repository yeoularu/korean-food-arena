/**
 * Nationality utilities for country codes, names, and flag emojis
 * Based on ISO 3166-1 alpha-2 country codes
 */

export interface Country {
  code: string // ISO 3166-1 alpha-2
  name: string
  flag: string // Unicode flag emoji
}

/**
 * Flag emoji mapping for country codes
 * Uses Unicode regional indicator symbols to create flag emojis
 */
export const FLAG_EMOJIS: Record<string, string> = {
  // Special cases
  unknown: '🌍', // Globe for unknown/prefer not to say

  // Major countries (50+ countries as per requirements)
  AD: '🇦🇩', // Andorra
  AE: '🇦🇪', // United Arab Emirates
  AF: '🇦🇫', // Afghanistan
  AG: '🇦🇬', // Antigua and Barbuda
  AI: '🇦🇮', // Anguilla
  AL: '🇦🇱', // Albania
  AM: '🇦🇲', // Armenia
  AO: '🇦🇴', // Angola
  AQ: '🇦🇶', // Antarctica
  AR: '🇦🇷', // Argentina
  AS: '🇦🇸', // American Samoa
  AT: '🇦🇹', // Austria
  AU: '🇦🇺', // Australia
  AW: '🇦🇼', // Aruba
  AX: '🇦🇽', // Åland Islands
  AZ: '🇦🇿', // Azerbaijan
  BA: '🇧🇦', // Bosnia and Herzegovina
  BB: '🇧🇧', // Barbados
  BD: '🇧🇩', // Bangladesh
  BE: '🇧🇪', // Belgium
  BF: '🇧🇫', // Burkina Faso
  BG: '🇧🇬', // Bulgaria
  BH: '🇧🇭', // Bahrain
  BI: '🇧🇮', // Burundi
  BJ: '🇧🇯', // Benin
  BL: '🇧🇱', // Saint Barthélemy
  BM: '🇧🇲', // Bermuda
  BN: '🇧🇳', // Brunei
  BO: '🇧🇴', // Bolivia
  BQ: '🇧🇶', // Caribbean Netherlands
  BR: '🇧🇷', // Brazil
  BS: '🇧🇸', // Bahamas
  BT: '🇧🇹', // Bhutan
  BV: '🇧🇻', // Bouvet Island
  BW: '🇧🇼', // Botswana
  BY: '🇧🇾', // Belarus
  BZ: '🇧🇿', // Belize
  CA: '🇨🇦', // Canada
  CC: '🇨🇨', // Cocos Islands
  CD: '🇨🇩', // Democratic Republic of the Congo
  CF: '🇨🇫', // Central African Republic
  CG: '🇨🇬', // Republic of the Congo
  CH: '🇨🇭', // Switzerland
  CI: '🇨🇮', // Côte d'Ivoire
  CK: '🇨🇰', // Cook Islands
  CL: '🇨🇱', // Chile
  CM: '🇨🇲', // Cameroon
  CN: '🇨🇳', // China
  CO: '🇨🇴', // Colombia
  CR: '🇨🇷', // Costa Rica
  CU: '🇨🇺', // Cuba
  CV: '🇨🇻', // Cape Verde
  CW: '🇨🇼', // Curaçao
  CX: '🇨🇽', // Christmas Island
  CY: '🇨🇾', // Cyprus
  CZ: '🇨🇿', // Czech Republic
  DE: '🇩🇪', // Germany
  DJ: '🇩🇯', // Djibouti
  DK: '🇩🇰', // Denmark
  DM: '🇩🇲', // Dominica
  DO: '🇩🇴', // Dominican Republic
  DZ: '🇩🇿', // Algeria
  EC: '🇪🇨', // Ecuador
  EE: '🇪🇪', // Estonia
  EG: '🇪🇬', // Egypt
  EH: '🇪🇭', // Western Sahara
  ER: '🇪🇷', // Eritrea
  ES: '🇪🇸', // Spain
  ET: '🇪🇹', // Ethiopia
  FI: '🇫🇮', // Finland
  FJ: '🇫🇯', // Fiji
  FK: '🇫🇰', // Falkland Islands
  FM: '🇫🇲', // Micronesia
  FO: '🇫🇴', // Faroe Islands
  FR: '🇫🇷', // France
  GA: '🇬🇦', // Gabon
  GB: '🇬🇧', // United Kingdom
  GD: '🇬🇩', // Grenada
  GE: '🇬🇪', // Georgia
  GF: '🇬🇫', // French Guiana
  GG: '🇬🇬', // Guernsey
  GH: '🇬🇭', // Ghana
  GI: '🇬🇮', // Gibraltar
  GL: '🇬🇱', // Greenland
  GM: '🇬🇲', // Gambia
  GN: '🇬🇳', // Guinea
  GP: '🇬🇵', // Guadeloupe
  GQ: '🇬🇶', // Equatorial Guinea
  GR: '🇬🇷', // Greece
  GS: '🇬🇸', // South Georgia and the South Sandwich Islands
  GT: '🇬🇹', // Guatemala
  GU: '🇬🇺', // Guam
  GW: '🇬🇼', // Guinea-Bissau
  GY: '🇬🇾', // Guyana
  HK: '🇭🇰', // Hong Kong
  HM: '🇭🇲', // Heard Island and McDonald Islands
  HN: '🇭🇳', // Honduras
  HR: '🇭🇷', // Croatia
  HT: '🇭🇹', // Haiti
  HU: '🇭🇺', // Hungary
  ID: '🇮🇩', // Indonesia
  IE: '🇮🇪', // Ireland
  IL: '🇮🇱', // Israel
  IM: '🇮🇲', // Isle of Man
  IN: '🇮🇳', // India
  IO: '🇮🇴', // British Indian Ocean Territory
  IQ: '🇮🇶', // Iraq
  IR: '🇮🇷', // Iran
  IS: '🇮🇸', // Iceland
  IT: '🇮🇹', // Italy
  JE: '🇯🇪', // Jersey
  JM: '🇯🇲', // Jamaica
  JO: '🇯🇴', // Jordan
  JP: '🇯🇵', // Japan
  KE: '🇰🇪', // Kenya
  KG: '🇰🇬', // Kyrgyzstan
  KH: '🇰🇭', // Cambodia
  KI: '🇰🇮', // Kiribati
  KM: '🇰🇲', // Comoros
  KN: '🇰🇳', // Saint Kitts and Nevis
  KP: '🇰🇵', // North Korea
  KR: '🇰🇷', // South Korea
  KW: '🇰🇼', // Kuwait
  KY: '🇰🇾', // Cayman Islands
  KZ: '🇰🇿', // Kazakhstan
  LA: '🇱🇦', // Laos
  LB: '🇱🇧', // Lebanon
  LC: '🇱🇨', // Saint Lucia
  LI: '🇱🇮', // Liechtenstein
  LK: '🇱🇰', // Sri Lanka
  LR: '🇱🇷', // Liberia
  LS: '🇱🇸', // Lesotho
  LT: '🇱🇹', // Lithuania
  LU: '🇱🇺', // Luxembourg
  LV: '🇱🇻', // Latvia
  LY: '🇱🇾', // Libya
  MA: '🇲🇦', // Morocco
  MC: '🇲🇨', // Monaco
  MD: '🇲🇩', // Moldova
  ME: '🇲🇪', // Montenegro
  MF: '🇲🇫', // Saint Martin
  MG: '🇲🇬', // Madagascar
  MH: '🇲🇭', // Marshall Islands
  MK: '🇲🇰', // North Macedonia
  ML: '🇲🇱', // Mali
  MM: '🇲🇲', // Myanmar
  MN: '🇲🇳', // Mongolia
  MO: '🇲🇴', // Macao
  MP: '🇲🇵', // Northern Mariana Islands
  MQ: '🇲🇶', // Martinique
  MR: '🇲🇷', // Mauritania
  MS: '🇲🇸', // Montserrat
  MT: '🇲🇹', // Malta
  MU: '🇲🇺', // Mauritius
  MV: '🇲🇻', // Maldives
  MW: '🇲🇼', // Malawi
  MX: '🇲🇽', // Mexico
  MY: '🇲🇾', // Malaysia
  MZ: '🇲🇿', // Mozambique
  NA: '🇳🇦', // Namibia
  NC: '🇳🇨', // New Caledonia
  NE: '🇳🇪', // Niger
  NF: '🇳🇫', // Norfolk Island
  NG: '🇳🇬', // Nigeria
  NI: '🇳🇮', // Nicaragua
  NL: '🇳🇱', // Netherlands
  NO: '🇳🇴', // Norway
  NP: '🇳🇵', // Nepal
  NR: '🇳🇷', // Nauru
  NU: '🇳🇺', // Niue
  NZ: '🇳🇿', // New Zealand
  OM: '🇴🇲', // Oman
  PA: '🇵🇦', // Panama
  PE: '🇵🇪', // Peru
  PF: '🇵🇫', // French Polynesia
  PG: '🇵🇬', // Papua New Guinea
  PH: '🇵🇭', // Philippines
  PK: '🇵🇰', // Pakistan
  PL: '🇵🇱', // Poland
  PM: '🇵🇲', // Saint Pierre and Miquelon
  PN: '🇵🇳', // Pitcairn
  PR: '🇵🇷', // Puerto Rico
  PS: '🇵🇸', // Palestine
  PT: '🇵🇹', // Portugal
  PW: '🇵🇼', // Palau
  PY: '🇵🇾', // Paraguay
  QA: '🇶🇦', // Qatar
  RE: '🇷🇪', // Réunion
  RO: '🇷🇴', // Romania
  RS: '🇷🇸', // Serbia
  RU: '🇷🇺', // Russia
  RW: '🇷🇼', // Rwanda
  SA: '🇸🇦', // Saudi Arabia
  SB: '🇸🇧', // Solomon Islands
  SC: '🇸🇨', // Seychelles
  SD: '🇸🇩', // Sudan
  SE: '🇸🇪', // Sweden
  SG: '🇸🇬', // Singapore
  SH: '🇸🇭', // Saint Helena
  SI: '🇸🇮', // Slovenia
  SJ: '🇸🇯', // Svalbard and Jan Mayen
  SK: '🇸🇰', // Slovakia
  SL: '🇸🇱', // Sierra Leone
  SM: '🇸🇲', // San Marino
  SN: '🇸🇳', // Senegal
  SO: '🇸🇴', // Somalia
  SR: '🇸🇷', // Suriname
  SS: '🇸🇸', // South Sudan
  ST: '🇸🇹', // São Tomé and Príncipe
  SV: '🇸🇻', // El Salvador
  SX: '🇸🇽', // Sint Maarten
  SY: '🇸🇾', // Syria
  SZ: '🇸🇿', // Eswatini
  TC: '🇹🇨', // Turks and Caicos Islands
  TD: '🇹🇩', // Chad
  TF: '🇹🇫', // French Southern Territories
  TG: '🇹🇬', // Togo
  TH: '🇹🇭', // Thailand
  TJ: '🇹🇯', // Tajikistan
  TK: '🇹🇰', // Tokelau
  TL: '🇹🇱', // Timor-Leste
  TM: '🇹🇲', // Turkmenistan
  TN: '🇹🇳', // Tunisia
  TO: '🇹🇴', // Tonga
  TR: '🇹🇷', // Turkey
  TT: '🇹🇹', // Trinidad and Tobago
  TV: '🇹🇻', // Tuvalu
  TW: '🇹🇼', // Taiwan
  TZ: '🇹🇿', // Tanzania
  UA: '🇺🇦', // Ukraine
  UG: '🇺🇬', // Uganda
  UM: '🇺🇲', // United States Minor Outlying Islands
  US: '🇺🇸', // United States
  UY: '🇺🇾', // Uruguay
  UZ: '🇺🇿', // Uzbekistan
  VA: '🇻🇦', // Vatican City
  VC: '🇻🇨', // Saint Vincent and the Grenadines
  VE: '🇻🇪', // Venezuela
  VG: '🇻🇬', // British Virgin Islands
  VI: '🇻🇮', // U.S. Virgin Islands
  VN: '🇻🇳', // Vietnam
  VU: '🇻🇺', // Vanuatu
  WF: '🇼🇫', // Wallis and Futuna
  WS: '🇼🇸', // Samoa
  XK: '🇽🇰', // Kosovo
  YE: '🇾🇪', // Yemen
  YT: '🇾🇹', // Mayotte
  ZA: '🇿🇦', // South Africa
  ZM: '🇿🇲', // Zambia
  ZW: '🇿🇼', // Zimbabwe
}

/**
 * Comprehensive country list with 50+ major countries
 * Sorted alphabetically by name for easy navigation
 */
export const COUNTRIES: Country[] = [
  { code: 'unknown', name: 'Prefer not to say', flag: '🌍' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
]

// Performance optimization: Create lookup maps for O(1) access
const COUNTRY_BY_CODE = new Map<string, Country>()
const COUNTRY_CODE_SET = new Set<string>()

// Initialize lookup maps for performance
COUNTRIES.forEach((country) => {
  COUNTRY_BY_CODE.set(country.code, country)
  COUNTRY_CODE_SET.add(country.code)
})

// Cache for search results to improve performance
const searchCache = new Map<string, Country[]>()
const CACHE_SIZE_LIMIT = 100

/**
 * Get flag emoji for a country code (optimized with Map lookup)
 * @param countryCode ISO 3166-1 alpha-2 country code
 * @returns Flag emoji or fallback globe emoji
 */
export function getCountryFlag(countryCode?: string): string {
  if (!countryCode || typeof countryCode !== 'string')
    return FLAG_EMOJIS.unknown
  return FLAG_EMOJIS[countryCode.toUpperCase()] || FLAG_EMOJIS.unknown
}

/**
 * Get country name for a country code (optimized with Map lookup)
 * @param countryCode ISO 3166-1 alpha-2 country code
 * @returns Country name or 'Unknown'
 */
export function getCountryName(countryCode?: string): string {
  if (!countryCode || typeof countryCode !== 'string') return 'Unknown'
  const country = COUNTRY_BY_CODE.get(countryCode)
  return country?.name || 'Unknown'
}

/**
 * Get country object for a country code (optimized with Map lookup)
 * @param countryCode ISO 3166-1 alpha-2 country code
 * @returns Country object or unknown country object
 */
export function getCountry(countryCode?: string): Country {
  if (!countryCode || typeof countryCode !== 'string') return COUNTRIES[0] // 'unknown' is first
  const country = COUNTRY_BY_CODE.get(countryCode)
  return country || COUNTRIES[0]
}

/**
 * Check if a country code is valid (optimized with Set lookup)
 * @param countryCode ISO 3166-1 alpha-2 country code
 * @returns True if valid country code
 */
export function isValidCountryCode(countryCode?: string): boolean {
  if (!countryCode || typeof countryCode !== 'string') return false
  return COUNTRY_CODE_SET.has(countryCode)
}

/**
 * Search countries by name (case-insensitive, with caching for performance)
 * @param query Search query
 * @returns Array of matching countries
 */
export function searchCountries(query: string): Country[] {
  if (!query || typeof query !== 'string' || !query.trim()) return COUNTRIES

  const lowerQuery = query.trim().toLowerCase()

  // Check cache first
  if (searchCache.has(lowerQuery)) {
    return searchCache.get(lowerQuery)!
  }

  // Perform search
  const results = COUNTRIES.filter((country) =>
    country.name.toLowerCase().includes(lowerQuery),
  )

  // Cache results (with size limit to prevent memory leaks)
  if (searchCache.size >= CACHE_SIZE_LIMIT) {
    // Clear oldest entries (simple FIFO)
    const firstKey = searchCache.keys().next().value
    searchCache.delete(firstKey)
  }
  searchCache.set(lowerQuery, results)

  return results
}
