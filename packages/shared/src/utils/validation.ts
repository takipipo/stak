// Validation utilities and constraints
export const ValidationConstraints = {
  // Key constraints
  TENANT_KEY_CANNOT_CONTAIN_HASH: 'tenant_key cannot contain # character',
  USER_ID_CANNOT_CONTAIN_HASH: 'user_id cannot contain # character',
  INBOX_KEY_CANNOT_CONTAIN_HASH: 'inbox_key cannot contain # character',

  // TTL constraints
  TTL_FORMAT_REGEX: /^\d+[dms]$/,
  TTL_MAX_DAYS: 720,
  TTL_FORMAT_MESSAGE: 'TTL duration must be in format: number + d/m/s (e.g., 30d, 300m, 6000s)',

  // Message constraints
  MAX_MESSAGES_PER_READ_REQUEST: 50,

  // Default values
  DEFAULT_INBOX_KEY: 'DEFAULT'
} as const

// Validation helper functions
export const validateKey = (key: string, keyName: string): boolean => {
  return key.length > 0 && !key.includes('#')
}

export const validateTTLDuration = (duration: string): boolean => {
  if (!ValidationConstraints.TTL_FORMAT_REGEX.test(duration)) return false

  const match = duration.match(/^(\d+)([dms])$/)
  if (!match) return false

  const [, num, unit] = match
  const value = parseInt(num)
  if (unit === 'd') return value <= ValidationConstraints.TTL_MAX_DAYS

  return true
}

