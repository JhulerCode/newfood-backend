import { getIO } from '#infrastructure/socket.js'
import { getRedisClient, getJson, setJson } from '#infrastructure/redisClient.js'

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60

function sessionKey(session_id) {
    return `session:${session_id}`
}

function colaboradorSessionKey(colaborador_id) {
    return `session_colaborador:${colaborador_id}`
}

async function guardarSesion(colaborador_id, session_data) {
    const session_id = session_data.session_id
    const previous_session_id = await getRedisClient().get(colaboradorSessionKey(colaborador_id))
    const data = {
        ...session_data,
        colaborador_id,
        updated_at: new Date().toISOString(),
    }

    if (previous_session_id && previous_session_id !== session_id) {
        await getRedisClient().del(sessionKey(previous_session_id))
    }

    await setJson(sessionKey(session_id), data, SESSION_TTL_SECONDS)
    await getRedisClient().set(colaboradorSessionKey(colaborador_id), session_id, {
        EX: SESSION_TTL_SECONDS,
    })

    return data
}

async function obtenerSesion(colaborador_id) {
    const session_id = await getRedisClient().get(colaboradorSessionKey(colaborador_id))
    if (!session_id) return null

    return await obtenerSesionPorId(session_id)
}

async function obtenerSesionPorId(session_id) {
    if (!session_id) return null
    return await getJson(sessionKey(session_id))
}

async function borrarSesion(colaborador_id) {
    const session_id = await getRedisClient().get(colaboradorSessionKey(colaborador_id))

    if (session_id) await getRedisClient().del(sessionKey(session_id))
    await getRedisClient().del(colaboradorSessionKey(colaborador_id))
}

async function borrarSesionPorId(session_id) {
    const sesion = await obtenerSesionPorId(session_id)
    if (!sesion) return

    await getRedisClient().del(sessionKey(session_id))
    await getRedisClient().del(colaboradorSessionKey(sesion.colaborador_id || sesion.id))
}

async function actualizarSesion(id, values) {
    const sesion = await obtenerSesion(id)
    if (!sesion || !values) return

    Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined) {
            sesion[key] = value
        }
    })

    await guardarSesion(sesion.colaborador_id || sesion.id, sesion)

    console.log(`Empresa: ${values.empresa} | Action: colaborador updated`)
    getIO().to(sesion.empresa).emit('colaborador-updated', sesion)

    return sesion
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
