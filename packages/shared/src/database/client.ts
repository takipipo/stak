// DynamoDB client configuration
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

let dynamoClient: DynamoDBClient
let docClient: DynamoDBDocumentClient

export function createDynamoClient(): DynamoDBClient {
  if (!dynamoClient) {
    dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1'
    })
  }
  return dynamoClient
}

export function createDocumentClient(): DynamoDBDocumentClient {
  if (!docClient) {
    const client = createDynamoClient()
    docClient = DynamoDBDocumentClient.from(client)
  }
  return docClient
}
