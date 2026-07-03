import { getRedisClient, getJson, setJson } from '#infrastructure/redis/client.js'
import { redisKeys } from '#infrastructure/redis/keys.js'
import { actualizarColaborador, obtenerColaborador, guardarColaborador } from './colaboradores.js'

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
        created_at: values.created_at || values.updated_at || new Date().toISOString(),
        updated_at: values.updated_at || new Date().toISOString(),
    }
}

async function guardarSesion(colaborador_id, session_data) {
    const session_id = session_data.session_id
    const colaborador = await obtenerColaborador(colaborador_id)
    const legacy_session_id = await getRedisClient().get(redisKeys.legacyColaboradorSession(colaborador_id))
    const previous_session_id = colaborador?.active_session_id || legacy_session_id
    const current_session = await obtenerSesionPorId(session_id)
    const data = cleanSession({
        session_id,
        colaborador_id,
        refresh_token_id: session_data.refresh_token_id,
        client_info: session_data.client_info || current_session?.client_info || null,
        created_at: current_session?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
    })

    if (previous_session_id && previous_session_id !== session_id) {
        await getRedisClient().del(redisKeys.session(previous_session_id))
    }
    if (legacy_session_id) await getRedisClient().del(redisKeys.legacyColaboradorSession(colaborador_id))

    await setJson(redisKeys.session(session_id), data, SESSION_TTL_SECONDS)

    if (session_data.empresa) {
        await guardarColaborador(colaborador_id, {
            ...session_data,
            active_session_id: session_id,
        })
    }

    return data
}

async function obtenerSesion(colaborador_id) {
    const colaborador = await obtenerColaborador(colaborador_id)
    const session_id = colaborador?.active_session_id
    if (!session_id) return null

    return await obtenerSesionPorId(session_id)
}

async function obtenerSesionPorId(session_id) {
    if (!session_id) return null
    const session = await getJson(redisKeys.session(session_id))
    if (!session) return null

    const clean_session = cleanSession(session)
    if (JSON.stringify(clean_session) !== JSON.stringify(session)) {
        await setJson(redisKeys.session(session_id), clean_session, SESSION_TTL_SECONDS)
    }

    return clean_session
}

async function borrarSesion(colaborador_id) {
    const colaborador = await obtenerColaborador(colaborador_id)
    const session_id = colaborador?.active_session_id

    if (session_id) await getRedisClient().del(redisKeys.session(session_id))
    if (colaborador) await guardarColaborador(colaborador_id, { active_session_id: null })
    await getRedisClient().del(redisKeys.legacyColaboradorSession(colaborador_id))
}

async function borrarSesionPorId(session_id) {
    const sesion = await obtenerSesionPorId(session_id)
    if (!sesion) return

    await getRedisClient().del(redisKeys.session(session_id))
    const colaborador = await obtenerColaborador(sesion.colaborador_id)
    if (colaborador) await guardarColaborador(sesion.colaborador_id, { active_session_id: null })
    await getRedisClient().del(redisKeys.legacyColaboradorSession(sesion.colaborador_id))
}

async function actualizarSesion(id, values) {
    return await actualizarColaborador(id, values)
}

async function refreshSesion(session_id, values) {
    const sesion = await obtenerSesionPorId(session_id)
    if (!sesion || !values) return null

    const data = {
        ...sesion,
        ...values,
    }

    return await guardarSesion(data.colaborador_id || data.id, data)
}

export {
    SESSION_TTL_SECONDS,
    guardarSesion,
    obtenerSesion,
    obtenerSesionPorId,
    borrarSesion,
    borrarSesionPorId,
    actualizarSesion,
    refreshSesion,
}
