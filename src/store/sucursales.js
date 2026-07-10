import { getIO } from '#infrastructure/socket.js'
import { getRedisClient, getJson, setJson } from '#infrastructure/redis/client.js'
import { redisKeys } from '#infrastructure/redis/keys.js'

const SUCURSAL_TTL_SECONDS = 60 * 60

async function obtenerSucursal(id) {
    return await getJson(redisKeys.sucursal(id))
}

async function obtenerSucursalesPorEmpresa(empresa_id) {
    const keys = await getRedisClient().keys(redisKeys.sucursalPattern())
    const sucursales = []

    for (const key of keys) {
        const sucursal = await getJson(key)
        if (sucursal?.empresa == empresa_id) sucursales.push(sucursal)
    }

    return sucursales
}

async function guardarSucursal(id, values) {
    await setJson(redisKeys.sucursal(id), values, SUCURSAL_TTL_SECONDS)

    return await obtenerSucursal(id)
}

async function borrarSucursal(id) {
    await getRedisClient().del(redisKeys.sucursal(id))
}

async function actualizarSucursal(id, values) {
    let sucursal = await obtenerSucursal(id)
    if (!values) return

    if (!sucursal) {
        return
    }

    Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined) {
            sucursal[key] = value
        }
    })

    await setJson(redisKeys.sucursal(id), sucursal, SUCURSAL_TTL_SECONDS)

    console.log(`Empresa: ${values.empresa} | Action: sucursal updated`)
    getIO().to(id).emit('sucursal-updated', sucursal)

    return sucursal
}

export {
    obtenerSucursal,
    obtenerSucursalesPorEmpresa,
    guardarSucursal,
    borrarSucursal,
    actualizarSucursal,
}
