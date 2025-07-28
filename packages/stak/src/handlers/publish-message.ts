import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, type PutCommandInput } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({})
const ddbDocClient = DynamoDBDocumentClient.from(client)

// Get the DynamoDB table name from environment variables
const tableName = process.env.SAMPLE_TABLE

/**
 * A simple example includes a HTTP post method to add one item to a DynamoDB table.
 */
export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    throw new Error(`postMethod only accepts POST method, you tried: ${event.httpMethod} method.`)
  }
  // All log statements are written to CloudWatch
  console.info('received:', event)

  try {
    // Get id and name from the body of the request
    const body = JSON.parse(event.body)
    const id = body.id
    const name = body.name

    if (!id) {
      throw new Error('Invalid input error')
    }

    // Creates a new item, or replaces an old item with a new item
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#put-property
    const params: PutCommandInput = {
      TableName: tableName,
      Item: { id: id, name: name }
    }

    const data = await ddbDocClient.send(new PutCommand(params))
    console.log('Success - item added or updated', data)

    const response = {
      statusCode: 200,
      body: JSON.stringify(body)
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
  }
}
