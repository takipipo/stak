import { UserMessageModel } from '@stak/shared'
import { HttpHandlerBuilder } from '../utils/http.lambda'

export const handler = new HttpHandlerBuilder()
  .useMethod('POST')
  .useJsonBody((b) => {
    const { content, author, to, tenantKey } = b
    if (!content || typeof content !== 'string') {
      throw new Error(`body.content is required.`)
    }
    if (!author || typeof author !== 'string') {
      throw new Error(`body.author is required.`)
    }
    if (!to || typeof to !== 'string') {
      throw new Error(`body.to is required.`)
    }
    if (!tenantKey || typeof tenantKey !== 'string') {
      throw new Error(`body.tenantKey is required.`)
    }
    return { content, author, to, tenantKey }
  })
  .usePath('tenantKey')
  .useSuccessStatusCode(200)
  .run(async (i) => {
    // Creates a new item, or replaces an old item with a new item
    const m = await UserMessageModel.create({
      body: i.body.content,
      tenantKey: i.body.tenantKey,
      inboxKey: 'DEFAULT',
      messageId: 'ABC', // TODO: Generate Message ID
      userId: i.body.to
    })

    return m
  })
  .build()
