import { Context, APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda'
import { createPartitionKey } from '@stak/shared'

export async function handler(
  _event: APIGatewayEvent,
  _context: Context
): Promise<APIGatewayProxyResult> {
  //
  console.info('handler invoked!')

  const partiionKey = createPartitionKey('TEST', 'UID123')

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `hi hello hot-reloaded!!!`,
      key: partiionKey
    })
  }
}
