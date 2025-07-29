import { createPartitionKey } from '@stak/shared'
import { HttpHandlerBuilder } from './utils'

export const handler = new HttpHandlerBuilder()
  .useMethod('GET')
  .run(async () => {
    const partiionKey = createPartitionKey('TEST', 'UID123')
    return {
      message: `hi hello hot-reloaded!!!`,
      key: partiionKey
    }
  })
  .build()
