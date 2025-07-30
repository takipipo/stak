/**
 * Base error class for all Stak application errors
 * Provides consistent error structure with status codes and error codes
 */
export abstract class StakError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly timestamp: number
  public readonly details?: Record<string, any>

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: Record<string, any>
  ) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.timestamp = Date.now()
    this.details = details

    // Ensures proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype)

    // Capture stack trace if available
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Converts error to JSON format for API responses
   */
  toJSON() {
    return {
      success: false,
      error: {
        name: this.name,
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
        details: this.details
      }
    }
  }

  /**
   * Returns a user-friendly error message
   */
  toUserMessage(): string {
    return this.message
  }
}

/**
 * Client errors (4xx status codes)
 */
export abstract class ClientError extends StakError {
  constructor(
    message: string,
    code: string,
    statusCode: number = 400,
    details?: Record<string, any>
  ) {
    super(message, code, statusCode, details)
  }
}

/**
 * Server errors (5xx status codes)
 */
export abstract class ServerError extends StakError {
  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: Record<string, any>
  ) {
    super(message, code, statusCode, details)
  }
}

