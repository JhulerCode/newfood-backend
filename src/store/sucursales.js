import { getIO } from '#infrastructure/socket.js'
import {
    actualizarSucursalEnEmpresa,
    borrarSucursalEnEmpresa,
    buscarSucursalEnEmpresas,
} from './empresas.js'

const sucursalesStore = new Map()

function obtenerSucursal(id) {
    return sucursalesStore.get(id)
}

function guardarSucursal(id, values) {
    sucursalesStore.set(id, values)
    actualizarSucursalEnEmpresa(values)

    return obtenerSucursal(id)
}

function borrarSucursal(id) {
    borrarSucursalEnEmpresa(obtenerSucursal(id))
    sucursalesStore.delete(id)
}

function actualizarSucursal(id, values) {
    let sucursal = obtenerSucursal(id)
    if (!values) return

    if (!sucursal) {
        const empresa_sucursal = buscarSucursalEnEmpresas(id)
        if (!empresa_sucursal) return

        sucursal = empresa_sucursal
        sucursalesStore.set(id, sucursal)
    }

    Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined) {
            sucursal[key] = value
        }
    })

    console.log(`📡 Empresa: ${values.empresa} | Action: sucursal updated`)
    actualizarSucursalEnEmpresa(sucursal)
    getIO().to(id).emit('sucursal-updated', obtenerSucursal(id))

    return obtenerSucursal(id)
}

export { sucursalesStore, obtenerSucursal, guardarSucursal, borrarSucursal, actualizarSucursal }
