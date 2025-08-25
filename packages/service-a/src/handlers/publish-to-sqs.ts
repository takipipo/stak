import { HttpHandlerBuilder } from '../utils/http.lambda'
import { SQS } from '@aws-sdk/client-sqs'

const sqs = new SQS()

const queueUrl = process.env.SHARED_QUEUE_URL

export const handler = new HttpHandlerBuilder()
  .useMethod('POST')
  .useJsonBody((b) => {
    const { message } = b
    if (!message || typeof message !== 'string') {
      throw new Error(`body.message is required.`)
    }
    return { message }
  })
  .run(async (i) => {
    await sqs.sendMessage({QueueUrl: queueUrl, MessageBody: JSON.stringify(i.body)})
    return {
      message: 'Message published to SQS'
    }
  }).build()
