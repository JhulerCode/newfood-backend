const sessionStore = new Map();

function guardarSesion(userId, sessionData) {
    sessionStore.set(userId, sessionData)
    // console.log(sessionStore)
}

function obtenerSesion(userId) {
    return sessionStore.get(userId);
}

function borrarSesion(userId) {
    sessionStore.delete(userId)
    // console.log(sessionStore)
}

function actualizarSesion(id, values) {
    const sesion = obtenerSesion(id)
    if (!sesion || !values) return

    Object.entries(values).forEach(([key, value]) => {
        // Evita asignar undefined (por ejemplo, si no se pasó la propiedad)
        if (value !== undefined) {
            sesion[key] = value
        }
    })
}

export {
    sessionStore,
    guardarSesion,
    obtenerSesion,
    borrarSesion,
    actualizarSesion,
}