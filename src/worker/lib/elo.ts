/**
 * ELO Rating System Implementation
 *
 * Implements the standard ELO algorithm for rating updates based on match results.
 * Uses K-factor of 32 as specified in the design document.
 */

export type MatchResult = 'win' | 'loss' | 'tie'

export interface ELORatingUpdate {
  newRating1: number
  newRating2: number
}

export class ELOCalculator {
  private static readonly K_FACTOR = 32 // Standard K-factor for ELO

  /**
   * Calculate expected score for a player given their rating and opponent's rating
   * @param playerRating - Current rating of the player
   * @param opponentRating - Current rating of the opponent
   * @returns Expected score (0-1, where 1 is certain win)
   */
  static calculateExpectedScore(
    playerRating: number,
    opponentRating: number,
  ): number {
    return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400))
  }

  /**
   * Calculate new ratings for both players after a match
   * @param rating1 - Current rating of player 1
   * @param rating2 - Current rating of player 2
   * @param result - Match result from player 1's perspective ('win', 'loss', 'tie')
   * @returns Object containing new ratings for both players
   */
  static calculateNewRatings(
    rating1: number,
    rating2: number,
    result: MatchResult,
  ): ELORatingUpdate {
    // Calculate expected scores
    const expected1 = this.calculateExpectedScore(rating1, rating2)
    const expected2 = this.calculateExpectedScore(rating2, rating1)

    // Determine actual scores based on result
    let actual1: number, actual2: number

    switch (result) {
      case 'win':
        actual1 = 1
        actual2 = 0
        break
      case 'loss':
        actual1 = 0
        actual2 = 1
        break
      case 'tie':
        actual1 = 0.5
        actual2 = 0.5
        break
      default:
        throw new Error(`Invalid match result: ${result}`)
    }

    // Calculate new ratings using ELO formula: newRating = oldRating + K * (actual - expected)
    const newRating1 = Math.round(
      rating1 + this.K_FACTOR * (actual1 - expected1),
    )
    const newRating2 = Math.round(
      rating2 + this.K_FACTOR * (actual2 - expected2),
    )

    return { newRating1, newRating2 }
  }

  /**
   * Calculate rating change for a single player
   * @param currentRating - Player's current rating
   * @param opponentRating - Opponent's current rating
   * @param result - Match result from player's perspective
   * @returns The rating change (positive or negative)
   */
  static calculateRatingChange(
    currentRating: number,
    opponentRating: number,
    result: MatchResult,
  ): number {
    const expected = this.calculateExpectedScore(currentRating, opponentRating)

    let actual: number
    switch (result) {
      case 'win':
        actual = 1
        break
      case 'loss':
        actual = 0
        break
      case 'tie':
        actual = 0.5
        break
      default:
        throw new Error(`Invalid match result: ${result}`)
    }

    return Math.round(this.K_FACTOR * (actual - expected))
  }

  /**
   * Validate that ratings are within reasonable bounds
   * @param rating - Rating to validate
   * @returns True if rating is valid
   */
  static isValidRating(rating: number): boolean {
    return Number.isInteger(rating) && rating >= 0 && rating <= 4000
  }
}
