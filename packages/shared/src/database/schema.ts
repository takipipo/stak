import { Entity, Model, Table } from 'dynamodb-onetable'

import { createDynamoClient } from './client.js'

const TheSchema = {
  format: 'onetable:1.0.0',
  version: '0.0.1',
  indexes: {
    primary: { hash: 'pk', sort: 'sk' }
  },
  models: {
    UserMessage: {
      pk: { type: String, value: 't#${tenantKey}U#${userId}#${inboxKey}' },
      sk: { type: String, value: 'm#${messageId}' },
      tenantKey: { type: String },
      userId: { type: String },
      messageId: { type: String },
      inboxKey: { type: String },
      body: { type: String }
    }
  } as const
}

// Entity Type
export type UserMessage = Entity<typeof TheSchema.models.UserMessage>

// The Table
const DDB_TABLE_NAME = process.env.DDB_TABLE_NAME

if (!DDB_TABLE_NAME) {
  throw new Error(`Invalid state cannot initialize system without process.env.DDB_TABLE_NAME`)
}

const table = new Table({
  client: createDynamoClient(),
  name: DDB_TABLE_NAME,
  schema: TheSchema
})

// Interactable Models
export const UserMessageModel: Model<UserMessage> = table.getModel('UserMessage')
