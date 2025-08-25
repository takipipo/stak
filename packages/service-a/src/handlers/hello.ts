import { HttpHandlerBuilder } from '../utils/http.lambda'


export const handler = new HttpHandlerBuilder()
  .useMethod('GET')
  .run(async () => {
    return {
      message: 'Hello, world!'
    }
  })
  .build()