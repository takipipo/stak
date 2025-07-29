import type { APIGatewayEvent } from 'aws-lambda'

export type AllowedMethod = 'POST' | 'GET' | 'PUT' | 'DELETE' | 'PATCH'

export function requiredHttpMethod(
  event: APIGatewayEvent,
  ...requiredMethod: AllowedMethod[]
): AllowedMethod {
  const i = event.httpMethod as AllowedMethod
  if (requiredMethod.indexOf(i) >= 0) {
    return i
  }
  throw new Error(`Invalid httpMethod. Expected one of ${requiredMethod.join(', ')}. Got ${i}.`)
}

export function requiredJsonBody<J>(event: APIGatewayEvent, marshaller?: (o: any) => J): J {
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
      `Invalid body. Expected valid JSON input. But marshalling failed.: ${e.message}`
    )
  }
}
