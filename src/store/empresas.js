import { getIO } from '#infrastructure/socket.js'
import { getRedisClient, getJson, setJson } from '#infrastructure/redis/client.js'
import { redisKeys } from '#infrastructure/redis/keys.js'

const EMPRESA_TTL_SECONDS = 60 * 60

function cleanEmpresa(values) {
    if (!values) return null

    const { sucursales, ...empresa } = values
    return empresa
}

async function obtenerEmpresa(id) {
    const empresa = await getJson(redisKeys.empresa(id))
    if (!empresa) return null

    return empresa
}

async function obtenerEmpresaPorSubdominio(subdominio) {
    const id = await getRedisClient().get(redisKeys.empresaSubdominio(subdominio))
    if (!id) return null

    return await obtenerEmpresa(id)
}

async function guardarEmpresa(id, values) {
    const empresa = cleanEmpresa(values)
    await setJson(redisKeys.empresa(id), empresa, EMPRESA_TTL_SECONDS)

    if (empresa?.subdominio) {
        await getRedisClient().set(
            redisKeys.empresaSubdominio(empresa.subdominio),
            id,
            'EX',
            EMPRESA_TTL_SECONDS,
        )
    }

    return await obtenerEmpresa(id)
}

async function borrarEmpresa(id) {
    const empresa = await obtenerEmpresa(id)
    if (empresa?.subdominio) await getRedisClient().del(redisKeys.empresaSubdominio(empresa.subdominio))
    await getRedisClient().del(redisKeys.empresa(id))
}

async function actualizarEmpresa(id, values) {
    const empresa = await obtenerEmpresa(id)
    if (!empresa || !values) return

    Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined) {
            empresa[key] = value
        }
    })

    await guardarEmpresa(id, empresa)

    console.log(`Empresa: ${values.razon_social} | Action: empresa updated`)
    getIO().to(id).emit('empresa-updated', empresa)

    return empresa
}

export {
    obtenerEmpresa,
    obtenerEmpresaPorSubdominio,
    guardarEmpresa,
    borrarEmpresa,
    actualizarEmpresa,
}
