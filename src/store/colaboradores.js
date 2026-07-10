import { getIO } from '#infrastructure/socket.js'
import { getRedisClient, getJson, setJson } from '#infrastructure/redis/client.js'
import { redisKeys } from '#infrastructure/redis/keys.js'

const COLABORADOR_TTL_SECONDS = 30 * 24 * 60 * 60

function cleanColaborador(values) {
    if (!values) return null

    const {
        contrasena,
        session_id,
        refresh_token_id,
        ip,
        user_agent,
        device,
        client_info,
        created_at,
        updated_at,
        ...colaborador
    } = values
    return colaborador
}

async function obtenerColaborador(id) {
    return await getJson(redisKeys.colaborador(id))
}

async function guardarColaborador(id, values) {
    if (!values) return null

    const colaborador = cleanColaborador(values)

    await setJson(redisKeys.colaborador(id), colaborador, COLABORADOR_TTL_SECONDS)
    return await obtenerColaborador(id)
}

async function actualizarColaborador(id, values) {
    const current = await obtenerColaborador(id)
    if (!current || !values) return null

    const colaborador = {
        ...current,
        ...cleanColaborador(values),
    }

    await setJson(redisKeys.colaborador(id), colaborador, COLABORADOR_TTL_SECONDS)

    console.log(`Empresa: ${values.empresa} | Action: colaborador updated`)
    getIO().to(colaborador.empresa).emit('colaborador-updated', colaborador)

    return colaborador
}

async function borrarColaborador(id) {
    await getRedisClient().del(redisKeys.colaborador(id))
}

export {
    COLABORADOR_TTL_SECONDS,
    obtenerColaborador,
    guardarColaborador,
    actualizarColaborador,
    borrarColaborador,
}
