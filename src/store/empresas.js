import { getIO } from '#infrastructure/socket.js'

const empresasStore = new Map()

function obtenerEmpresa(id) {
    return empresasStore.get(id)
}

function guardarEmpresa(id, values) {
    empresasStore.set(id, values)
}

function borrarEmpresa(id) {
    empresasStore.delete(id)
}

function actualizarEmpresa(id, values) {
    const sesion = obtenerEmpresa(id)
    if (!sesion || !values) return

    Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined) {
            sesion[key] = value
        }
    })

    console.log(`📡 Empresa: ${values.razon_social} | Action: empresa updated`)
    getIO().to(values.id).emit('empresa-updated', obtenerEmpresa(id))
}

export { empresasStore, obtenerEmpresa, guardarEmpresa, borrarEmpresa, actualizarEmpresa }
