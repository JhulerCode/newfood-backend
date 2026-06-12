import { getIO } from '#infrastructure/socket.js'

const empresasStore = new Map()

function obtenerEmpresa(id) {
    return empresasStore.get(id)
}

function guardarEmpresa(id, values) {
    empresasStore.set(id, values)
    return obtenerEmpresa(id)
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

    return obtenerEmpresa(id)
}

function actualizarSucursalEnEmpresa(sucursal) {
    if (!sucursal?.empresa) return null

    const empresa = obtenerEmpresa(sucursal.empresa)
    if (!empresa) return null

    if (!Array.isArray(empresa.sucursales)) empresa.sucursales = []

    const index = empresa.sucursales.findIndex((item) => item.id === sucursal.id)
    if (index >= 0) empresa.sucursales.splice(index, 1, sucursal)
    else empresa.sucursales.push(sucursal)

    return empresa
}

function borrarSucursalEnEmpresa(sucursal) {
    if (!sucursal?.empresa) return null

    const empresa = obtenerEmpresa(sucursal.empresa)
    if (!empresa || !Array.isArray(empresa.sucursales)) return empresa

    empresa.sucursales = empresa.sucursales.filter((item) => item.id !== sucursal.id)
    return empresa
}

function buscarSucursalEnEmpresas(sucursalId) {
    for (const empresa of empresasStore.values()) {
        const sucursal = empresa?.sucursales?.find((item) => item.id === sucursalId)
        if (sucursal) return sucursal
    }

    return null
}

export {
    empresasStore,
    obtenerEmpresa,
    guardarEmpresa,
    borrarEmpresa,
    actualizarEmpresa,
    actualizarSucursalEnEmpresa,
    borrarSucursalEnEmpresa,
    buscarSucursalEnEmpresas,
}
