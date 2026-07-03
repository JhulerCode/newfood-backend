import { getIO } from '#infrastructure/socket.js'
import { getRedisClient, getJson, setJson } from '#infrastructure/redisClient.js'
import {
    actualizarSucursalEnEmpresa,
    borrarSucursalEnEmpresa,
    buscarSucursalEnEmpresas,
} from './empresas.js'

const SUCURSAL_TTL_SECONDS = 60 * 60

function sucursalKey(id) {
    return `sucursal:${id}`
}

async function obtenerSucursal(id) {
    return await getJson(sucursalKey(id))
}

async function guardarSucursal(id, values) {
    if (!values) return await obtenerSucursal(id)

    const current = (await obtenerSucursal(id)) || (await buscarSucursalEnEmpresas(id)) || {}
    const sucursal = { ...current, ...values, id: values.id || id }

    await setJson(sucursalKey(id), sucursal, SUCURSAL_TTL_SECONDS)
    await actualizarSucursalEnEmpresa(sucursal)

    return await obtenerSucursal(id)
}

async function borrarSucursal(id) {
    await borrarSucursalEnEmpresa(await obtenerSucursal(id))
    await getRedisClient().del(sucursalKey(id))
}

async function actualizarSucursal(id, values) {
    let sucursal = await obtenerSucursal(id)
    if (!values) return

    if (!sucursal) {
        const empresa_sucursal = await buscarSucursalEnEmpresas(id)
        if (!empresa_sucursal) return

        sucursal = empresa_sucursal
        await setJson(sucursalKey(id), sucursal, SUCURSAL_TTL_SECONDS)
    }

    Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined) {
            sucursal[key] = value
        }
    })

    await setJson(sucursalKey(id), sucursal, SUCURSAL_TTL_SECONDS)
    await actualizarSucursalEnEmpresa(sucursal)

    console.log(`Empresa: ${values.empresa} | Action: sucursal updated`)
    getIO().to(id).emit('sucursal-updated', sucursal)

    return sucursal
}

export { obtenerSucursal, guardarSucursal, borrarSucursal, actualizarSucursal }
