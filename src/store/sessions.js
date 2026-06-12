import { getIO } from '#infrastructure/socket.js'

const sessionStore = new Map()

function guardarSesion(userId, sessionData) {
    sessionStore.set(userId, sessionData)
    return obtenerSesion(userId)
}

function obtenerSesion(userId) {
    return sessionStore.get(userId)
}

function borrarSesion(userId) {
    sessionStore.delete(userId)
}

function actualizarSesion(id, values) {
    const sesion = obtenerSesion(id)
    if (!sesion || !values) return

    Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined) {
            sesion[key] = value
        }
    })

    console.log(`📡 Empresa: ${values.empresa} | Action: colaborador updated`)
    getIO().to(sesion.empresa).emit('colaborador-updated', obtenerSesion(id))

    return obtenerSesion(id)
}

export { sessionStore, guardarSesion, obtenerSesion, borrarSesion, actualizarSesion }
