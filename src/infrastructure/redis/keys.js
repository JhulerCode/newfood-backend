import config from '../../config.js'

const REDIS_KEY_PREFIX = config.REDIS_KEY_PREFIX

function prefixedKey(name) {
    return `${REDIS_KEY_PREFIX}${name}`
}

const redisKeys = {
    session: (session_id) => prefixedKey(`session:${session_id}`),
    sessionPattern: () => prefixedKey('session:*'),
    colaborador: (colaborador_id) => prefixedKey(`colaborador:${colaborador_id}`),
    colaboradorPattern: () => prefixedKey('colaborador:*'),
    empresa: (id) => prefixedKey(`empresa:${id}`),
    empresaSubdominio: (subdominio) => prefixedKey(`empresa_subdominio:${subdominio}`),
    sucursal: (id) => prefixedKey(`sucursal:${id}`),
    sucursalPattern: () => prefixedKey('sucursal:*'),
    all: () => prefixedKey('*'),
}

export { REDIS_KEY_PREFIX, redisKeys }
