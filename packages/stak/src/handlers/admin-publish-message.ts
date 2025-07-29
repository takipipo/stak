import type { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda'

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, type PutCommandInput } from '@aws-sdk/lib-dynamodb'
import { requiredHttpMethod, requiredJsonBody } from '../validation/http.validation'

const client = new DynamoDBClient({})
const ddbDocClient = DynamoDBDocumentClient.from(client)

// Get the DynamoDB table name from environment variables
const tableName = process.env.SAMPLE_TABLE

export async function handler(
  event: APIGatewayEvent,
  _context: Context
): Promise<APIGatewayProxyResult> {
  try {
    // Validations
    requiredHttpMethod(event, 'POST')

    const { id, name } = requiredJsonBody<{ id: string; name: string }>(event, (o) => {
      if (!o.id) {
        throw new Error('body.id is required.')
      }
      return o
    })

    // Creates a new item, or replaces an old item with a new item
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#put-property
    const params: PutCommandInput = {
      TableName: tableName,
      Item: { id: id, name: name }
    }

    const data = await ddbDocClient.send(new PutCommand(params))
    console.log('Success - item added or updated', data)

    const response: APIGatewayProxyResult = {
      statusCode: 200,
      body: JSON.stringify({ id, name })
    }

    // All log statements are written to CloudWatch
    console.info(
      `response from: ${event.path} statusCode: ${response.statusCode} body: ${response.body}`
    )
    return response
  } catch (e) {
    if (e instanceof Error) {
      console.error(`Failed to parse input: ${e.message}`)
      return {
        statusCode: 400,
        body: JSON.stringify({
          reason: e.message
        })
      }
    }
    console.error(`Failed to handle message: ${e}`)
    return {
      statusCode: 500,
      body: JSON.stringify({
        reason: 'Something went wrong'
      })
    }
  }
}
