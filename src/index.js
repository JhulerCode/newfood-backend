import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import config from './config.js'
import routes from '#http/routes.js'
import { initSocket } from '#infrastructure/socket.js'
import { initSucursalAccessScheduler } from '#core/sucursales/sSucursalAccess.js'
import { connectRedis } from '#infrastructure/redisClient.js'

const app = express()

// --- MIDDLEWARES --- //
app.disable('x-powered-by')
app.use(cors({ origin: JSON.parse(config.hostFrontend), credentials: true }))
app.use(cookieParser())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// --- RUTAS --- //
app.use(routes)

// --- START SERVER --- //
const PORT = config.PORT || 3000
await connectRedis()
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
})

// --- SOCKET --- //
initSocket(server)

// --- SUCURSALES --- //
initSucursalAccessScheduler()
