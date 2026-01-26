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

async function actualizarEmpresa(id, values) {
    const empresa = obtenerEmpresa(id)
    if (!empresa || !values) return

    Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined) {
            empresa[key] = value
        }
    })

    console.log(`📡 Empresa: ${values.razon_social} | Action: empresa updated`)
    getIO().to(id).emit('empresa-updated', obtenerEmpresa(id)) // Falta hacer que emita a todas las sucursales
}

export { empresasStore, obtenerEmpresa, guardarEmpresa, borrarEmpresa, actualizarEmpresa }
