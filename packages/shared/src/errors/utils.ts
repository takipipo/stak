import { StakError } from './base.js'

/**
 * Utility functions for error handling
 */

/**
 * Checks if an error is a StakError
 */
export function isStakError(error: unknown): error is StakError {
  return error instanceof StakError
}

/**
 * Safely extracts error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unknown error occurred'
}

/**
 * Safely extracts status code from error, defaults to 500
 */
export function getStatusCode(error: unknown): number {
  if (isStakError(error)) {
    return error.statusCode
  }
  return 500
}

/**
 * Converts any error to a standardized error response format
 */
export function toErrorResponse(error: unknown) {
  if (isStakError(error)) {
    return error.toJSON()
  }

  return {
    success: false,
    error: {
      name: 'UnknownError',
      code: 'UNKNOWN_ERROR',
      message: getErrorMessage(error),
      statusCode: 500,
      timestamp: Date.now()
    }
  }
}

/**
 * Creates a safe error for logging (removes sensitive information)
 */
export function toSafeError(error: unknown): Record<string, any> {
  const baseError = {
    name: 'UnknownError',
    message: getErrorMessage(error),
    timestamp: Date.now()
  }

  if (isStakError(error)) {
    return {
      ...baseError,
      name: error.name,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details
    }
  }

  if (error instanceof Error) {
    return {
      ...baseError,
      name: error.name,
      stack: error.stack
    }
  }

  return baseError
}

/**
 * Wraps a function to catch and convert errors to StakError format
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => R | Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      const result = await fn(...args)
      return result
    } catch (error) {
      if (isStakError(error)) {
        throw error
      }

      // Convert unknown errors to generic server errors
      const { ServerError } = await import('./base.js')
      
      class InternalError extends ServerError {
        constructor(originalError: unknown) {
          super(getErrorMessage(originalError), 'INTERNAL_ERROR', 500, {
            originalError: originalError instanceof Error ? originalError.name : typeof originalError
          })
        }
      }
      
      throw new InternalError(error)
    }
  }
}

/**
 * Error aggregation utility for batch operations
 */
export class ErrorAggregator {
  private errors: StakError[] = []

  add(error: StakError): void {
    this.errors.push(error)
  }

  addAll(errors: StakError[]): void {
    this.errors.push(...errors)
  }

  hasErrors(): boolean {
    return this.errors.length > 0
  }

  getErrors(): readonly StakError[] {
    return this.errors
  }

  getFirstError(): StakError | undefined {
    return this.errors[0]
  }

  clear(): void {
    this.errors = []
  }

  /**
   * Throws an error if any errors have been accumulated
   */
  throwIfErrors(): void {
    if (this.hasErrors()) {
      const { ServerError } = require('./base.js')
      
      class MultipleErrors extends ServerError {
        constructor(errors: StakError[]) {
          super(`Multiple errors occurred (${errors.length} errors)`, 'MULTIPLE_ERRORS', 500, {
            errorCount: errors.length,
            errors: errors.map((e) => e.toJSON())
          })
        }
      }
      
      throw new MultipleErrors(this.errors)
    }
  }
}

