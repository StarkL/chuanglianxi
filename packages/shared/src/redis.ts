import IORedis from 'ioredis'

let redis: IORedis | null = null

export function getRedis(url: string): IORedis {
  if (!redis) {
    redis = new IORedis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableOfflineQueue: false,
    })

    redis.on('error', (err) => {
      console.error('[redis] connection error:', err.message)
    })

    redis.on('connect', () => {
      console.info('[redis] connected')
    })
  }

  return redis
}

export async function closeRedis() {
  if (redis) {
    await redis.quit()
    redis = null
  }
}
