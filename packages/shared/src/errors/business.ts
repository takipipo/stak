import { ClientError, ServerError } from './base.js'

/**
 * Authentication and authorization errors
 */
export class UnauthorizedError extends ClientError {
  constructor(message: 'invalid-token' | 'expired-token', details?: Record<string, any>) {
    super(message, 'UNAUTHORIZED', 401, details)
  }
}

export class ForbiddenError extends ClientError {
  constructor(message: 'access-forbidden', details?: Record<string, any>) {
    super(message, 'FORBIDDEN', 403, details)
  }
}

/**
 * Resource errors
 */
export class NotFoundError extends ClientError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`
    super(message, 'NOT_FOUND', 404, { resource, identifier })
  }
}

export class ConflictError extends ClientError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CONFLICT', 409, details)
  }
}

export class ResourceExistsError extends ConflictError {
  constructor(resource: string, identifier: string) {
    super(`${resource} with identifier '${identifier}' already exists`, { resource, identifier })
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends ClientError {
  constructor(limit: number, windowSeconds: number, retryAfter?: number) {
    super(
      `Rate limit exceeded: ${limit} requests per ${windowSeconds} seconds`,
      'RATE_LIMIT_EXCEEDED',
      429,
      { limit, windowSeconds, retryAfter }
    )
  }
}

/**
 * Payload errors
 */
export class PayloadTooLargeError extends ClientError {
  constructor(maxSize: number, actualSize: number) {
    super(
      `Payload too large. Maximum size: ${maxSize} bytes, received: ${actualSize} bytes`,
      'PAYLOAD_TOO_LARGE',
      413,
      { maxSize, actualSize }
    )
  }
}

/**
 * External service errors
 */
export class ExternalServiceError extends ServerError {
  constructor(serviceName: string, operation: string, details?: Record<string, any>) {
    super(
      `External service error: ${serviceName} failed during ${operation}`,
      'EXTERNAL_SERVICE_ERROR',
      502,
      { serviceName, operation, ...details }
    )
  }
}

export class DatabaseError extends ServerError {
  constructor(operation: string, details?: Record<string, any>) {
    super(`Database error during ${operation}`, 'DATABASE_ERROR', 500, { operation, ...details })
  }
}

export class TimeoutError extends ServerError {
  constructor(operation: string, timeoutMs: number) {
    super(`Operation '${operation}' timed out after ${timeoutMs}ms`, 'TIMEOUT_ERROR', 504, {
      operation,
      timeoutMs
    })
  }
}
