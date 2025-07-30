import { ClientError } from './base.js'

/**
 * Validation error for invalid input data
 */
export class ValidationError extends ClientError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, details)
  }

  static required(field: string): ValidationError {
    return new ValidationError(`Field '${field}' is required`, { field })
  }

  static invalid(field: string, reason?: string): ValidationError {
    const message = reason
      ? `Field '${field}' is invalid: ${reason}`
      : `Field '${field}' is invalid`
    return new ValidationError(message, { field, reason })
  }

  static format(field: string, expectedFormat: string): ValidationError {
    return new ValidationError(`Field '${field}' must be in format: ${expectedFormat}`, {
      field,
      expectedFormat
    })
  }

  static range(field: string, min?: number, max?: number): ValidationError {
    let message = `Field '${field}' is out of range`
    if (min !== undefined && max !== undefined) {
      message += ` (expected: ${min}-${max})`
    } else if (min !== undefined) {
      message += ` (minimum: ${min})`
    } else if (max !== undefined) {
      message += ` (maximum: ${max})`
    }
    return new ValidationError(message, { field, min, max })
  }
}

/**
 * Error for malformed JSON or request body
 */
export class MalformedRequestError extends ClientError {
  constructor(message: string = 'Request body is malformed', details?: Record<string, any>) {
    super(message, 'MALFORMED_REQUEST', 400, details)
  }
}

/**
 * Error for missing required headers
 */
export class MissingHeaderError extends ClientError {
  constructor(headerName: string) {
    super(`Required header '${headerName}' is missing`, 'MISSING_HEADER', 400, { headerName })
  }
}

/**
 * Error for invalid HTTP method
 */
export class MethodNotAllowedError extends ClientError {
  constructor(method: string, allowedMethods: string[]) {
    super(
      `HTTP method '${method}' is not allowed. Allowed methods: ${allowedMethods.join(', ')}`,
      'METHOD_NOT_ALLOWED',
      405,
      { method, allowedMethods }
    )
  }
}
