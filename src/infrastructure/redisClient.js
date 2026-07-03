import { createClient } from 'redis'
import config from '../config.js'

let redis_client = null

async function connectRedis() {
    if (!config.REDIS_URI) {
        throw new Error('REDIS_URI no configurado')
    }

    if (redis_client?.isOpen) return redis_client

    redis_client = createClient({
        url: config.REDIS_URI,
    })

    redis_client.on('error', (error) => {
        console.error('Redis error:', error.message)
    })

    await redis_client.connect()
    console.log('Redis conectado')

    return redis_client
}

function getRedisClient() {
    if (!redis_client?.isOpen) {
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
        await getRedisClient().set(key, serialized, { EX: ttl_seconds })
        return value
    }

    await getRedisClient().set(key, serialized)
    return value
}

export { connectRedis, getRedisClient, getJson, setJson }
