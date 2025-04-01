import { env } from '@latitude-data/env'
import Redis from 'ioredis'

import { buildRedisConnection } from '../redis'

let connection: Redis

export const queuesConnection = async () => {
  if (connection) return connection

  connection = await buildRedisConnection({
    family: 0,
    host: env.QUEUE_HOST,
    port: env.QUEUE_PORT,
    password: env.QUEUE_PASSWORD,
    enableOfflineQueue: false,
    maxRetriesPerRequest: null,
    retryStrategy: (times: number) =>
      Math.max(Math.min(Math.exp(times), 20000), 1000), // Exponential backoff with a max of 20 seconds and a min of 1 second
  })

  return connection
}
