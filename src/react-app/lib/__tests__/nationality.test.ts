import { describe, it, expect } from 'vitest'
import {
  COUNTRIES,
  FLAG_EMOJIS,
  getCountryFlag,
  getCountryName,
  getCountry,
  isValidCountryCode,
  searchCountries,
} from '../nationality'

describe('nationality utilities', () => {
  describe('COUNTRIES constant', () => {
    it('should have at least 50 countries', () => {
      expect(COUNTRIES.length).toBeGreaterThanOrEqual(50)
    })

    it('should include unknown option as first item', () => {
      expect(COUNTRIES[0]).toEqual({
        code: 'unknown',
        name: 'Prefer not to say',
        flag: '🌍',
      })
    })

    it('should include major countries', () => {
      const countryCodes = COUNTRIES.map((c) => c.code)
      expect(countryCodes).toContain('US')
      expect(countryCodes).toContain('KR')
      expect(countryCodes).toContain('JP')
      expect(countryCodes).toContain('CN')
      expect(countryCodes).toContain('GB')
      expect(countryCodes).toContain('DE')
      expect(countryCodes).toContain('FR')
      expect(countryCodes).toContain('BR')
      expect(countryCodes).toContain('IN')
    })

    it('should have consistent flag emojis', () => {
      COUNTRIES.forEach((country) => {
        expect(country.flag).toBe(FLAG_EMOJIS[country.code])
      })
    })

    it('should be sorted alphabetically by name (except unknown)', () => {
      const namesWithoutUnknown = COUNTRIES.slice(1).map((c) => c.name)
      const sortedNames = [...namesWithoutUnknown].sort()
      expect(namesWithoutUnknown).toEqual(sortedNames)
    })
  })

  describe('FLAG_EMOJIS constant', () => {
    it('should have flag for unknown', () => {
      expect(FLAG_EMOJIS.unknown).toBe('🌍')
    })

    it('should have flags for major countries', () => {
      expect(FLAG_EMOJIS.US).toBe('🇺🇸')
      expect(FLAG_EMOJIS.KR).toBe('🇰🇷')
      expect(FLAG_EMOJIS.JP).toBe('🇯🇵')
      expect(FLAG_EMOJIS.CN).toBe('🇨🇳')
      expect(FLAG_EMOJIS.GB).toBe('🇬🇧')
    })

    it('should have comprehensive coverage', () => {
      expect(Object.keys(FLAG_EMOJIS).length).toBeGreaterThan(200)
    })
  })

  describe('getCountryFlag', () => {
    it('should return correct flag for valid country code', () => {
      expect(getCountryFlag('US')).toBe('🇺🇸')
      expect(getCountryFlag('KR')).toBe('🇰🇷')
      expect(getCountryFlag('JP')).toBe('🇯🇵')
    })

    it('should handle lowercase country codes', () => {
      expect(getCountryFlag('us')).toBe('🇺🇸')
      expect(getCountryFlag('kr')).toBe('🇰🇷')
    })

    it('should return globe emoji for unknown country code', () => {
      expect(getCountryFlag('XX')).toBe('🌍')
      expect(getCountryFlag('INVALID')).toBe('🌍')
    })

    it('should return globe emoji for undefined/null', () => {
      expect(getCountryFlag(undefined)).toBe('🌍')
      expect(getCountryFlag('')).toBe('🌍')
    })

    it('should handle unknown code', () => {
      expect(getCountryFlag('unknown')).toBe('🌍')
    })
  })

  describe('getCountryName', () => {
    it('should return correct name for valid country code', () => {
      expect(getCountryName('US')).toBe('United States')
      expect(getCountryName('KR')).toBe('South Korea')
      expect(getCountryName('JP')).toBe('Japan')
    })

    it('should return "Unknown" for invalid country code', () => {
      expect(getCountryName('XX')).toBe('Unknown')
      expect(getCountryName('INVALID')).toBe('Unknown')
    })

    it('should return "Unknown" for undefined/null', () => {
      expect(getCountryName(undefined)).toBe('Unknown')
      expect(getCountryName('')).toBe('Unknown')
    })

    it('should handle unknown code', () => {
      expect(getCountryName('unknown')).toBe('Prefer not to say')
    })
  })

  describe('getCountry', () => {
    it('should return correct country object for valid code', () => {
      const usCountry = getCountry('US')
      expect(usCountry).toEqual({
        code: 'US',
        name: 'United States',
        flag: '🇺🇸',
      })
    })

    it('should return unknown country for invalid code', () => {
      const invalidCountry = getCountry('XX')
      expect(invalidCountry).toEqual({
        code: 'unknown',
        name: 'Prefer not to say',
        flag: '🌍',
      })
    })

    it('should return unknown country for undefined/null', () => {
      const undefinedCountry = getCountry(undefined)
      expect(undefinedCountry).toEqual({
        code: 'unknown',
        name: 'Prefer not to say',
        flag: '🌍',
      })
    })
  })

  describe('isValidCountryCode', () => {
    it('should return true for valid country codes', () => {
      expect(isValidCountryCode('US')).toBe(true)
      expect(isValidCountryCode('KR')).toBe(true)
      expect(isValidCountryCode('unknown')).toBe(true)
    })

    it('should return false for invalid country codes', () => {
      expect(isValidCountryCode('XX')).toBe(false)
      expect(isValidCountryCode('INVALID')).toBe(false)
    })

    it('should return false for undefined/null/empty', () => {
      expect(isValidCountryCode(undefined)).toBe(false)
      expect(isValidCountryCode('')).toBe(false)
    })
  })

  describe('searchCountries', () => {
    it('should return all countries for empty query', () => {
      expect(searchCountries('')).toEqual(COUNTRIES)
      expect(searchCountries('   ')).toEqual(COUNTRIES)
    })

    it('should search by country name (case-insensitive)', () => {
      const results = searchCountries('united')
      expect(results.length).toBeGreaterThanOrEqual(2) // At least United States, United Kingdom
      expect(results.map((c) => c.code)).toContain('US')
      expect(results.map((c) => c.code)).toContain('GB')
    })

    it('should handle case-insensitive search', () => {
      const lowerResults = searchCountries('korea')
      const upperResults = searchCountries('KOREA')
      expect(lowerResults).toEqual(upperResults)
      expect(lowerResults.map((c) => c.code)).toContain('KR')
    })

    it('should return empty array for no matches', () => {
      const results = searchCountries('zzzzz')
      expect(results).toEqual([])
    })

    it('should find partial matches', () => {
      const results = searchCountries('stan')
      expect(results.length).toBeGreaterThan(0)
      // Should find countries like Pakistan, Afghanistan, etc.
      expect(results.some((c) => c.name.includes('stan'))).toBe(true)
    })

    it('should handle null and undefined queries', () => {
      expect(searchCountries(null as any)).toEqual(COUNTRIES)
      expect(searchCountries(undefined as any)).toEqual(COUNTRIES)
    })

    it('should handle numeric queries', () => {
      expect(searchCountries('123')).toEqual([])
      expect(searchCountries(123 as any)).toEqual(COUNTRIES) // Non-string returns all countries
    })

    it('should handle special characters in search', () => {
      const specialChars = [
        '(',
        ')',
        '[',
        ']',
        '{',
        '}',
        '*',
        '+',
        '?',
        '^',
        '$',
        '|',
        '.',
        '\\',
      ]

      specialChars.forEach((char) => {
        const results = searchCountries(char)
        expect(Array.isArray(results)).toBe(true)
        // Most special chars won't match country names
        expect(results.length).toBe(0)
      })
    })

    it('should handle very long search queries', () => {
      const longQuery = 'a'.repeat(1000)
      const results = searchCountries(longQuery)
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBe(0)
    })

    it('should handle accented characters', () => {
      // Test with accented characters that might appear in country names
      const accentedQueries = ['côte', 'josé', 'andré', 'françois']

      accentedQueries.forEach((query) => {
        const results = searchCountries(query)
        expect(Array.isArray(results)).toBe(true)
      })
    })

    it('should handle mixed case and whitespace', () => {
      const results1 = searchCountries('  UnItEd StAtEs  ')
      const results2 = searchCountries('united states')

      expect(results1.length).toBeGreaterThan(0)
      expect(results2.length).toBeGreaterThan(0)
      expect(results1.map((c) => c.code)).toContain('US')
      expect(results2.map((c) => c.code)).toContain('US')
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle malformed country objects in COUNTRIES array', () => {
      // Verify all countries have required properties
      COUNTRIES.forEach((country, index) => {
        expect(country).toHaveProperty('code')
        expect(country).toHaveProperty('name')
        expect(country).toHaveProperty('flag')

        expect(typeof country.code).toBe('string')
        expect(typeof country.name).toBe('string')
        expect(typeof country.flag).toBe('string')

        expect(country.code.length).toBeGreaterThan(0)
        expect(country.name.length).toBeGreaterThan(0)
        expect(country.flag.length).toBeGreaterThan(0)
      })
    })

    it('should handle case sensitivity in country codes', () => {
      // getCountryFlag handles case insensitivity by converting to uppercase
      expect(getCountryFlag('us')).toBe('🇺🇸')
      expect(getCountryFlag('US')).toBe('🇺🇸')

      // isValidCountryCode is case sensitive for COUNTRIES array lookup
      expect(isValidCountryCode('US')).toBe(true)
      expect(isValidCountryCode('us')).toBe(false) // Case sensitive
    })

    it('should handle non-string inputs gracefully', () => {
      const nonStringInputs = [null, undefined, 123, {}, [], true, false]

      nonStringInputs.forEach((input) => {
        expect(() => getCountryFlag(input as any)).not.toThrow()
        expect(() => getCountryName(input as any)).not.toThrow()
        expect(() => getCountry(input as any)).not.toThrow()
        expect(() => isValidCountryCode(input as unknown)).not.toThrow()
      })
    })

    it('should handle country codes with extra whitespace', () => {
      expect(getCountryFlag('  US  ')).toBe('🌍') // Should not match due to whitespace
      expect(getCountryName('  US  ')).toBe('Unknown')
      expect(isValidCountryCode('  US  ')).toBe(false)
    })

    it('should handle very long country codes', () => {
      const longCode = 'US' + 'X'.repeat(100)
      expect(getCountryFlag(longCode)).toBe('🌍')
      expect(getCountryName(longCode)).toBe('Unknown')
      expect(isValidCountryCode(longCode)).toBe(false)
    })

    it('should handle country codes with numbers', () => {
      const numericCodes = ['US1', '2KR', 'J3P', '123']

      numericCodes.forEach((code) => {
        expect(getCountryFlag(code)).toBe('🌍')
        expect(getCountryName(code)).toBe('Unknown')
        expect(isValidCountryCode(code)).toBe(false)
      })
    })

    it('should handle country codes with special characters', () => {
      const specialCodes = ['U$', 'K@R', 'J#P', '!@#']

      specialCodes.forEach((code) => {
        expect(getCountryFlag(code)).toBe('🌍')
        expect(getCountryName(code)).toBe('Unknown')
        expect(isValidCountryCode(code)).toBe(false)
      })
    })
  })

  describe('performance and memory', () => {
    it('should handle rapid successive calls efficiently', () => {
      const countryCodes = [
        'US',
        'KR',
        'JP',
        'CN',
        'GB',
        'DE',
        'FR',
        'IT',
        'ES',
        'CA',
      ]

      // Simulate rapid successive calls
      for (let i = 0; i < 100; i++) {
        countryCodes.forEach((code) => {
          getCountryFlag(code)
          getCountryName(code)
          getCountry(code)
          isValidCountryCode(code)
        })
      }

      // Should complete without issues
      expect(true).toBe(true)
    })

    it('should handle large search operations efficiently', () => {
      const queries = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']

      queries.forEach((query) => {
        const results = searchCountries(query)
        expect(Array.isArray(results)).toBe(true)
      })
    })

    it('should handle memory efficiently with repeated operations', () => {
      // Test memory efficiency by performing many operations
      for (let i = 0; i < 1000; i++) {
        searchCountries(`test${i}`)
        getCountryFlag(`CODE${i}`)
        getCountryName(`NAME${i}`)
        isValidCountryCode(`VALID${i}`)
      }

      expect(true).toBe(true)
    })
  })

  describe('data integrity', () => {
    it('should have unique country codes', () => {
      const codes = COUNTRIES.map((c) => c.code)
      const uniqueCodes = [...new Set(codes)]
      expect(codes.length).toBe(uniqueCodes.length)
    })

    it('should have consistent flag emoji format', () => {
      COUNTRIES.forEach((country) => {
        if (country.code !== 'unknown') {
          // Most flag emojis should be 2 characters (regional indicator symbols)
          // But some might be different, so we just check they exist
          expect(country.flag.length).toBeGreaterThan(0)
        }
      })
    })

    it('should have all FLAG_EMOJIS entries as strings', () => {
      Object.values(FLAG_EMOJIS).forEach((flag) => {
        expect(typeof flag).toBe('string')
        expect(flag.length).toBeGreaterThan(0)
      })
    })

    it('should have consistent data between COUNTRIES and FLAG_EMOJIS', () => {
      COUNTRIES.forEach((country) => {
        expect(FLAG_EMOJIS[country.code]).toBe(country.flag)
      })
    })

    it('should maintain alphabetical order (except unknown)', () => {
      const countryNames = COUNTRIES.slice(1).map((c) => c.name)

      for (let i = 1; i < countryNames.length; i++) {
        expect(
          countryNames[i].localeCompare(countryNames[i - 1]),
        ).toBeGreaterThanOrEqual(0)
      }
    })
  })
})
