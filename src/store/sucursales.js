import { getIO } from '#infrastructure/socket.js'

const sucursalesStore = new Map()

function obtenerSucursal(id) {
    return sucursalesStore.get(id)
}

function guardarSucursal(id, values) {
    sucursalesStore.set(id, values)

    return obtenerSucursal(id)
}

function borrarSucursal(id) {
    sucursalesStore.delete(id)
}

function actualizarSucursal(id, values) {
    const sucursal = obtenerSucursal(id)
    if (!sucursal || !values) return

    Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined) {
            sucursal[key] = value
        }
    })

    console.log(`📡 Empresa: ${values.empresa} | Action: sucursal updated`)
    getIO().to(id).emit('sucursal-updated', obtenerSucursal(id))

    return obtenerSucursal(id)
}

export { sucursalesStore, obtenerSucursal, guardarSucursal, borrarSucursal, actualizarSucursal }
