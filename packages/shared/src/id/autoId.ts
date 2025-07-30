import { createHash, randomInt } from 'crypto'

const contentSeed = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

const ONE_HOUR = 60 // in minutes
const ONE_DAY = 24 * ONE_HOUR
const ONE_YEAR = 366 * ONE_DAY // (including leap year)
const TOTAL_YEAR_SUPPORT = 114 * ONE_YEAR
const TOTAL_YEARS_IN_36_RADIX = TOTAL_YEAR_SUPPORT.toString(36).length // "zp500" (5 digits)
const SECOND_UNIT_MAX = 60 * 1000 // 1 minute in milliseconds
const SECOND_UNIT_SCALE = 2 // scale down so content is bound to 2ms per content.
const SECOND_UNIT_IN_36_RADIX = (SECOND_UNIT_MAX / SECOND_UNIT_SCALE).toString(36).length // "n5c" (3 digits)
const DEFAULT_AUTO_ID_OFFSET = '2025-01-01T00:00:00.000Z'

export class AutoId {
  /**
   * Format produced by this AutoId
   *
   * <(timestamp-offset worth of 114 years)(5)><SSS(3)> // number of milliseconds in 114 years in 36 radix (with second + milliseconds scale down by factor of 2)
   *
   * Given security level of ID collision:
   * -
   */
  private static readonly generateAutoId = (
    offset: Date = new Date(DEFAULT_AUTO_ID_OFFSET)
  ): AutoId => {
    return new AutoId(
      () => {
        const now = new Date().getTime()
        const elapsedInMs = now - offset.getTime()
        const elapsedInMins = Math.floor(elapsedInMs / SECOND_UNIT_MAX) % TOTAL_YEAR_SUPPORT
        const secondUnitInMs = elapsedInMs % SECOND_UNIT_MAX
        const prefix = elapsedInMins.toString(36).padStart(TOTAL_YEARS_IN_36_RADIX, '0') // 5 digits
        const secondUnit = (secondUnitInMs / SECOND_UNIT_SCALE)
          .toString(36)
          .padStart(SECOND_UNIT_IN_36_RADIX, '0')
        return [prefix, secondUnit].join('').toUpperCase()
      },
      {
        prefix: TOTAL_YEARS_IN_36_RADIX + SECOND_UNIT_IN_36_RADIX, // 5 + 3
        content: 9,
        checksum: 0
      }
    )
  }

  public static readonly messageId: AutoId = AutoId.generateAutoId()

  /**
   * Create the new id automatically regardless of the DB states.
   * @param prefix to be generated the id string
   * @param the randomized content length
   * @param the length of check sum to extract
   */
  public constructor(
    public readonly prefixMaker: () => string,
    public readonly lengths: { prefix: number; content: number; checksum: number } = {
      prefix: 7,
      content: 24,
      checksum: 4
    }
  ) {}

  public get prefix(): string {
    return this.prefixMaker()
  }

  private checksum(randomizedContent: string): string {
    if (this.lengths.checksum === 0) {
      return ''
    }
    const md5 = createHash('sha256')
    md5.update(randomizedContent)
    const checksum = md5.digest('hex').toUpperCase()
    const l = Math.min(checksum.length, this.lengths.checksum)
    return checksum.substring(0, l)
  }

  public produce(): string {
    let randomizedContent = ''
    for (let index = 0; index < this.lengths.content; index++) {
      randomizedContent = randomizedContent + contentSeed[randomInt(0, contentSeed.length)]
    }
    const checksumString = this.checksum(randomizedContent)
    return `${this.prefix || ''}${randomizedContent}${checksumString}`
  }

  // Extract content and validate if it is equal.
  public validate(prefixedContentWithChecksum: string): boolean {
    // Assumed prefix length is fixed.
    if (
      prefixedContentWithChecksum.length !==
      this.lengths.prefix + this.lengths.checksum + this.lengths.content
    ) {
      throw new Error(
        `Invalid content length expected: ${
          this.lengths.prefix + this.lengths.checksum + this.lengths.content
        }. Got ${prefixedContentWithChecksum} ${prefixedContentWithChecksum.length}.`
      )
    }
    const matchPattern = new RegExp(
      `^(.{${this.lengths.prefix + this.lengths.content}})(.{${this.lengths.checksum}})$`
    )
    // Validate prefix only if needed.
    const groups = prefixedContentWithChecksum.match(matchPattern)
    if (!groups || groups.length !== 3) {
      throw new Error('Invalid input format')
    }
    const prefixAndContent = groups[1]
    const checksum = groups[2]
    const computedChecksum = this.checksum(
      prefixAndContent.substring(this.lengths.prefix, this.lengths.prefix + this.lengths.content)
    )
    if (computedChecksum !== checksum) {
      throw new Error(
        `Checksum does not matches. Expected ${computedChecksum}. Got: ${prefixedContentWithChecksum} ${checksum}.`
      )
    }
    return true
  }
}
