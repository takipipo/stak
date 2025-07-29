import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, type GetCommandInput } from '@aws-sdk/lib-dynamodb'
import { HttpHandlerBuilder } from '../utils/http.lambda'

const client = new DynamoDBClient({})
const ddbDocClient = DynamoDBDocumentClient.from(client)

// Get the DynamoDB table name from environment variables
const tableName = process.env.SAMPLE_TABLE

/**
 * A simple example includes a HTTP get method to get one item by id from a DynamoDB table.
 */
export const handler = new HttpHandlerBuilder()
  .useMethod('GET')
  .run(async (_i, e) => {
    //
    // Get id from pathParameters from APIGateway because of `/{id}` at template.yaml
    const id = e.pathParameters && e.pathParameters.id
    // Get the item from the table
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#get-property
    const params: GetCommandInput = {
      TableName: tableName,
      Key: { id: id }
    }
    const data = await ddbDocClient.send(new GetCommand(params))
    console.log('RESPONSE FROM DYNAMODB', data)
    return {
      item: data.Item
    }
  })
  .build()
