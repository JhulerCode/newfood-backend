import { getIO } from '#infrastructure/socket.js'

const sucursalesStore = new Map()

async function obtenerSucursal(id) {
    return sucursalesStore.get(id)
}

function guardarSucursal(id, values) {
    sucursalesStore.set(id, values)
}

function borrarSucursal(id) {
    sucursalesStore.delete(id)
}

async function actualizarSucursal(id, values) {
    const sucursal = await obtenerSucursal(id)
    if (!sucursal || !values) return

    Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined) {
            sucursal[key] = value
        }
    })

    console.log(`📡 Empresa: ${values.empresa} | Action: sucursal updated`)
    getIO()
        .to(id)
        .emit('sucursal-updated', await obtenerSucursal(id))
}

export { sucursalesStore, obtenerSucursal, guardarSucursal, borrarSucursal, actualizarSucursal }
