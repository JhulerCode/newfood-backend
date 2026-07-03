import Redis from 'ioredis'
import config from '../../config.js'

let redis_client = null

async function connectRedis() {
    if (!config.REDIS_URI) {
        throw new Error('REDIS_URI no configurado')
    }

    if (redis_client?.status === 'ready') return redis_client

    redis_client = new Redis(config.REDIS_URI, {
        lazyConnect: true,
    })

    redis_client.on('error', (error) => {
        console.error('Redis error:', error.message)
    })

    if (redis_client.status !== 'ready') await redis_client.connect()
    console.log('Redis conectado')

    return redis_client
}

function getRedisClient() {
    if (redis_client?.status !== 'ready') {
        throw new Error('Redis no conectado')
    }

    return redis_client
}

async function getJson(key) {
    const value = await getRedisClient().get(key)
    return value ? JSON.parse(value) : null
}

async function setJson(key, value, ttl_seconds = null) {
    const serialized = JSON.stringify(value)

    if (ttl_seconds) {
        await getRedisClient().set(key, serialized, 'EX', ttl_seconds)
        return value
    }

    await getRedisClient().set(key, serialized)
    return value
}

export { connectRedis, getRedisClient, getJson, setJson }
