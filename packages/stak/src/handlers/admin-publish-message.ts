import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, type PutCommandInput } from '@aws-sdk/lib-dynamodb'

import { HttpHandlerBuilder } from '../utils/http.lambda'

const client = new DynamoDBClient({})
const ddbDocClient = DynamoDBDocumentClient.from(client)

// Get the DynamoDB table name from environment variables
const tableName = process.env.SAMPLE_TABLE

export const handler = new HttpHandlerBuilder()
  .useMethod('POST')
  .useJsonBody((b) => {
    const { id, name } = b
    if (!id) {
      throw new Error('body.id is required.')
    }
    return { id, name }
  })
  .useSuccessStatusCode(200)
  .run(async (i) => {
    // Creates a new item, or replaces an old item with a new item
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#put-property
    const params: PutCommandInput = {
      TableName: tableName,
      Item: i.body
    }

    const data = await ddbDocClient.send(new PutCommand(params))
    console.log('Success - item added or updated', data)

    return params
  })
  .build()
