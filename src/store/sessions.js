import { getRedisClient, getJson, setJson } from '#infrastructure/redis/client.js'
import { redisKeys } from '#infrastructure/redis/keys.js'
import { actualizarColaborador, obtenerColaborador } from './colaboradores.js'

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60

function cleanSession(values) {
    if (!values) return null

    const client_info = {
        ...(values.client_info || {}),
        ip: values.client_info?.ip || values.ip || null,
        user_agent: values.client_info?.user_agent || values.user_agent || null,
        device: values.client_info?.device || values.device || null,
    }

    return {
        session_id: values.session_id,
        colaborador_id: values.colaborador_id || values.id,
        refresh_token_id: values.refresh_token_id,
        client_info,
        created_at: values.created_at || new Date().toISOString(),
        updated_at: values.updated_at || new Date().toISOString(),
    }
}

async function guardarSesion(colaborador_id, session_data) {
    const data = cleanSession({
        ...session_data,
        colaborador_id,
        created_at: session_data.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
    })

    await setJson(redisKeys.session(data.session_id), data, SESSION_TTL_SECONDS)

    return await obtenerSesionPorId(data.session_id)
}

async function obtenerSesionPorId(session_id) {
    if (!session_id) return null

    return await getJson(redisKeys.session(session_id))
}

async function obtenerSesionesPorEmpresa(empresa_id) {
    const keys = await getRedisClient().keys(redisKeys.sessionPattern())
    const sesiones = []

    for (const key of keys) {
        const session = await getJson(key)
        if (!session?.colaborador_id) continue

        const colaborador = await obtenerColaborador(session.colaborador_id)
        if (colaborador?.empresa != empresa_id) continue

        sesiones.push({
            ...session,
            colaborador: colaborador.id,
            nombres: colaborador.nombres,
            apellidos: colaborador.apellidos,
            usuario: colaborador.usuario,
            empresa: colaborador.empresa,
            sucursal: colaborador.sucursal,
        })
    }

    return sesiones
}

async function borrarSesion(colaborador_id) {
    const keys = await getRedisClient().keys(redisKeys.sessionPattern())

    for (const key of keys) {
        const session = await getJson(key)
        if (session?.colaborador_id == colaborador_id) {
            await getRedisClient().del(redisKeys.session(session.session_id))
        }
    }
}

async function borrarSesionPorId(session_id) {
    if (!session_id) return

    await getRedisClient().del(redisKeys.session(session_id))
}

async function actualizarSesion(id, values) {
    return await actualizarColaborador(id, values)
}

async function refreshSesion(session_id, values) {
    const sesion = await obtenerSesionPorId(session_id)
    if (!sesion || !values) return null

    const data = cleanSession({
        ...sesion,
        ...values,
        updated_at: new Date().toISOString(),
    })

    await setJson(redisKeys.session(session_id), data, SESSION_TTL_SECONDS)

    return await obtenerSesionPorId(session_id)
}

export {
    SESSION_TTL_SECONDS,
    guardarSesion,
    obtenerSesionPorId,
    obtenerSesionesPorEmpresa,
    borrarSesion,
    borrarSesionPorId,
    actualizarSesion,
    refreshSesion,
}
