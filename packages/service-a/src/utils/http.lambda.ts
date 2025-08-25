import { isStakError, MalformedRequestError, MethodNotAllowedError } from '@stak/shared'
import type { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'

export interface HttpSuccessResult<T> {
  success: true
  data: T
}

export interface HttpFailureResult {
  success: false
  reason: string
}

export type HttpResult<T> = HttpSuccessResult<T> | HttpFailureResult

type HttpSuccessStatusCode = 200 | 201

interface BuilderRunHandler<I, T> {
  (input: I, event: APIGatewayEvent, context: Context): Promise<T>
}

type AllowedMethod = 'POST' | 'GET' | 'PUT' | 'DELETE' | 'PATCH'

type LambdaAPIGatewayEventHandler = (
  event: APIGatewayEvent,
  context: Context
) => Promise<APIGatewayProxyResult>

export const _helpers = {
  wrapToSuccess<T>(d: T): HttpSuccessResult<T> {
    return {
      success: true,
      data: d
    }
  },
  wrapToErrorResult(e: Error): HttpFailureResult {
    return {
      success: false,
      reason: (e && e.message) || `${e}`
    }
  },
  requiredHttpMethod(event: APIGatewayEvent, ...requiredMethod: AllowedMethod[]): AllowedMethod {
    const i = event.httpMethod as AllowedMethod
    if (requiredMethod.indexOf(i) >= 0) {
      return i
    }
    throw new MethodNotAllowedError(i, requiredMethod)
  },
  requiredJsonBody<J>(event: APIGatewayEvent, marshaller?: (o: any) => J): J {
    if (!event.body) {
      throw new Error(`Invalid body. Expected JSON input. Got empty`)
    }
    try {
      const rawJson = JSON.parse(event.body)
      if (marshaller) {
        return marshaller(rawJson)
      }
      return rawJson
    } catch (e) {
      throw new Error(
        `Invalid body. Expected valid JSON input. But marshalling failed.: ${(e as Error).message}`
      )
    }
  }
}

export class HttpHandlerBuilder<R = {}> {
  private h: BuilderRunHandler<R, any> = () => {
    throw new Error(`Implementation is required. Have you called '.run(handler)'?`)
  }

  public constructor(
    public successStatusCode: HttpSuccessStatusCode = 200,
    public validations: ((i: R, e: APIGatewayEvent, context: Context) => void)[] = []
  ) {
    //
  }

  public useMethod(m: AllowedMethod): HttpHandlerBuilder<R & Record<'method', AllowedMethod>> {
    this.validations.push((r, e) => {
      const method = _helpers.requiredHttpMethod(e, m)
      // augment it!
      ;(r as any)['method'] = method
    })
    return this as HttpHandlerBuilder<any>
  }

  public useJsonBody<T>(
    marshaller: (content: any) => T
  ): HttpHandlerBuilder<R & Record<'body', T>> {
    this.validations.push((r, e) => {
      const body = _helpers.requiredJsonBody(e, marshaller)
      // augment it!
      ;(r as any)['body'] = body
    })
    return this as HttpHandlerBuilder<any>
  }

  public usePath<K extends string>(
    key: K,
    regex?: RegExp
  ): HttpHandlerBuilder<R & Record<K, string>> {
    this.validations.push((r, e) => {
      const pathVal = (e.pathParameters || {})[key as string]?.toString()?.trim()
      if (!pathVal) {
        throw new MalformedRequestError(`Path: ${key} is missing.`)
      }
      if (regex && pathVal.match(regex)) {
        throw new MalformedRequestError(
          `Path: ${key} does not matches the required pattern. ${regex.source}.`
        )
      }
      ;(r as any)[key] = pathVal
    })
    // TODO: Add Path Validation
    return this as HttpHandlerBuilder<any>
  }

  public run(h: BuilderRunHandler<R, any>): HttpHandlerBuilder<R> {
    this.h = h
    return this
  }

  public useSuccessStatusCode(code: HttpSuccessStatusCode = 200): HttpHandlerBuilder<R> {
    this.successStatusCode = code
    return this
  }

  public build(): LambdaAPIGatewayEventHandler {
    return async (e: APIGatewayEvent, c: Context): Promise<APIGatewayProxyResult> => {
      try {
        // context augmentation buffer (to be reduced)
        let r = {} as any
        for (const v of this.validations) {
          v(r, e, c)
        }
        const result = await this.h(r, e, c)
        const resp = {
          statusCode: this.successStatusCode,
          body: JSON.stringify(_helpers.wrapToSuccess(result))
        }
        return resp
      } catch (e) {
        let statusCode = 500
        if (isStakError(e)) {
          statusCode = e.statusCode
        }
        return {
          statusCode,
          body: JSON.stringify(_helpers.wrapToErrorResult(e as Error))
        }
      }
    }
  }
}
