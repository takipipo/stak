import { Context, APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda'

export async function handler(
  _event: APIGatewayEvent,
  _context: Context
): Promise<APIGatewayProxyResult> {
  //
  console.info('handler invoked!')

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'hi hello hot-reloaded!!!'
    })
  }
}
