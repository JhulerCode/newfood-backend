import { getIO } from '#infrastructure/socket.js'
import { getRedisClient, getJson, setJson } from '#infrastructure/redisClient.js'

const EMPRESA_TTL_SECONDS = 60 * 60

function empresaKey(id) {
    return `empresa:${id}`
}

function empresaSubdominioKey(subdominio) {
    return `empresa_subdominio:${subdominio}`
}

async function obtenerEmpresa(id) {
    return await getJson(empresaKey(id))
}

async function obtenerEmpresaPorSubdominio(subdominio) {
    const id = await getRedisClient().get(empresaSubdominioKey(subdominio))
    if (!id) return null

    return await obtenerEmpresa(id)
}

async function guardarEmpresa(id, values) {
    await setJson(empresaKey(id), values, EMPRESA_TTL_SECONDS)

    if (values?.subdominio) {
        await getRedisClient().set(empresaSubdominioKey(values.subdominio), id, {
            EX: EMPRESA_TTL_SECONDS,
        })
    }

    return await obtenerEmpresa(id)
}

async function borrarEmpresa(id) {
    const empresa = await obtenerEmpresa(id)
    if (empresa?.subdominio) await getRedisClient().del(empresaSubdominioKey(empresa.subdominio))
    await getRedisClient().del(empresaKey(id))
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

async function actualizarSucursalEnEmpresa(sucursal) {
    if (!sucursal?.empresa) return null

    const empresa = await obtenerEmpresa(sucursal.empresa)
    if (!empresa) return null

    if (!Array.isArray(empresa.sucursales)) empresa.sucursales = []

    const index = empresa.sucursales.findIndex((item) => item.id === sucursal.id)
    if (index >= 0) empresa.sucursales.splice(index, 1, sucursal)
    else empresa.sucursales.push(sucursal)

    await guardarEmpresa(empresa.id, empresa)

    return empresa
}

async function borrarSucursalEnEmpresa(sucursal) {
    if (!sucursal?.empresa) return null

    const empresa = await obtenerEmpresa(sucursal.empresa)
    if (!empresa || !Array.isArray(empresa.sucursales)) return empresa

    empresa.sucursales = empresa.sucursales.filter((item) => item.id !== sucursal.id)
    await guardarEmpresa(empresa.id, empresa)

    return empresa
}

async function buscarSucursalEnEmpresas(sucursal_id) {
    const keys = await getRedisClient().keys('empresa:*')

    for (const key of keys) {
        const empresa = await getJson(key)
        const sucursal = empresa?.sucursales?.find((item) => item.id === sucursal_id)
        if (sucursal) return sucursal
    }

    return null
}

export {
    obtenerEmpresa,
    obtenerEmpresaPorSubdominio,
    guardarEmpresa,
    borrarEmpresa,
    actualizarEmpresa,
    actualizarSucursalEnEmpresa,
    borrarSucursalEnEmpresa,
    buscarSucursalEnEmpresas,
}
