import express from 'express'
import cors from 'cors'
import config from './config.js'
import routes from '#http/routes.js'
import { initSocket } from '#infrastructure/socket.js'

const app = express()

// --- MIDDLEWARES --- //
app.disable('x-powered-by')
app.use(cors({ origin: JSON.parse(config.hostFrontend) }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// --- RUTAS --- //
app.use(routes)

// --- START SERVER --- //
const PORT = config.PORT || 3000
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
})

// --- SOCKET --- //
initSocket(server)