import { ClientError, ServerError } from './base.js'
import { ForbiddenError, NotFoundError, ConflictError } from './business.js'

/**
 * Tenant-related errors
 */
export class TenantNotFoundError extends ClientError {
  constructor(tenantKey: string) {
    super(`Tenant '${tenantKey}' not found`, 'TENANT_NOT_FOUND', 404, { tenantKey })
  }
}

export class TenantDisabledError extends ClientError {
  constructor(tenantKey: string) {
    super(`Tenant '${tenantKey}' is disabled`, 'TENANT_DISABLED', 403, { tenantKey })
  }
}

export class TenantQuotaExceededError extends ClientError {
  constructor(tenantKey: string, quotaType: string, limit: number) {
    super(
      `Tenant '${tenantKey}' has exceeded ${quotaType} quota (limit: ${limit})`,
      'TENANT_QUOTA_EXCEEDED',
      429,
      { tenantKey, quotaType, limit }
    )
  }
}

/**
 * Inbox-related errors
 */
export class InboxNotFoundError extends ClientError {
  constructor(tenantKey: string, inboxKey: string) {
    super(
      `Inbox '${inboxKey}' not found in tenant '${tenantKey}'`,
      'INBOX_NOT_FOUND',
      404,
      { tenantKey, inboxKey }
    )
  }
}

export class InboxConfigurationError extends ClientError {
  constructor(tenantKey: string, inboxKey: string, reason: string) {
    super(
      `Inbox '${inboxKey}' in tenant '${tenantKey}' is misconfigured: ${reason}`,
      'INBOX_CONFIGURATION_ERROR',
      400,
      { tenantKey, inboxKey, reason }
    )
  }
}

/**
 * Message-related errors
 */
export class MessageNotFoundError extends ClientError {
  constructor(messageId: string, tenantKey?: string, inboxKey?: string) {
    super(
      `Message '${messageId}' not found`,
      'MESSAGE_NOT_FOUND',
      404,
      { messageId, tenantKey, inboxKey }
    )
  }
}

export class MessageExpiredError extends ClientError {
  constructor(messageId: string, expiredAt: number) {
    super(`Message '${messageId}' has expired`, 'MESSAGE_EXPIRED', 410, {
      messageId,
      expiredAt,
      expiredAtISO: new Date(expiredAt).toISOString()
    })
  }
}

export class MessageAlreadyReadError extends ClientError {
  constructor(messageId: string, readAt: number) {
    super(
      `Message '${messageId}' has already been read`,
      'MESSAGE_ALREADY_READ',
      409,
      {
        messageId,
        readAt,
        readAtISO: new Date(readAt).toISOString()
      }
    )
  }
}

export class InvalidMessageFormatError extends ClientError {
  constructor(reason: string, field?: string) {
    super(`Invalid message format: ${reason}`, 'INVALID_MESSAGE_FORMAT', 400, { reason, field })
  }
}

export class MessageTooLargeError extends ClientError {
  constructor(sizeBytes: number, maxSizeBytes: number) {
    super(
      `Message size (${sizeBytes} bytes) exceeds maximum allowed size (${maxSizeBytes} bytes)`,
      'MESSAGE_TOO_LARGE',
      413,
      { sizeBytes, maxSizeBytes }
    )
  }
}

/**
 * User-related errors
 */
export class UserNotFoundError extends ClientError {
  constructor(userId: string, tenantKey?: string) {
    super(
      `User '${userId}' not found`,
      'USER_NOT_FOUND',
      404,
      { userId, tenantKey }
    )
  }
}

export class InvalidUserIdError extends ClientError {
  constructor(userId: string, reason?: string) {
    const message = reason
      ? `Invalid user ID '${userId}': ${reason}`
      : `Invalid user ID '${userId}'`
    super(message, 'INVALID_USER_ID', 400, { userId, reason })
  }
}

/**
 * Audience and targeting errors
 */
export class InvalidAudienceError extends ClientError {
  constructor(reason: string, audienceType?: string) {
    super(`Invalid audience configuration: ${reason}`, 'INVALID_AUDIENCE', 400, {
      reason,
      audienceType
    })
  }
}

export class EmptyAudienceError extends InvalidAudienceError {
  constructor() {
    super('Audience cannot be empty when targeting specific users', 'users')
  }
}

export class AudienceTooLargeError extends ClientError {
  constructor(audienceSize: number, maxSize: number) {
    super(
      `Audience size (${audienceSize}) exceeds maximum allowed size (${maxSize})`,
      'AUDIENCE_TOO_LARGE',
      400,
      { audienceSize, maxSize }
    )
  }
}

/**
 * Category and taxonomy errors
 */
export class InvalidCategoryError extends ClientError {
  constructor(category: string, reason?: string) {
    const message = reason
      ? `Invalid category '${category}': ${reason}`
      : `Invalid category '${category}'`
    super(message, 'INVALID_CATEGORY', 400, { category, reason })
  }
}

/**
 * Pagination and query errors
 */
export class InvalidPaginationError extends ClientError {
  constructor(reason: string) {
    super(`Invalid pagination parameters: ${reason}`, 'INVALID_PAGINATION', 400, { reason })
  }
}

export class InvalidQueryError extends ClientError {
  constructor(reason: string, field?: string) {
    super(`Invalid query: ${reason}`, 'INVALID_QUERY', 400, { reason, field })
  }
}

// Re-export ForbiddenError for completeness
export { ForbiddenError } from './business.js'

