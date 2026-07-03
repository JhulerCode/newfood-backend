const REDIS_KEY_PREFIX = 'divergerest_'

function prefixedKey(name) {
    return `${REDIS_KEY_PREFIX}${name}`
}

const redisKeys = {
    session: (session_id) => prefixedKey(`session:${session_id}`),
    colaborador: (colaborador_id) => prefixedKey(`colaborador:${colaborador_id}`),
    legacyColaboradorSession: (colaborador_id) => prefixedKey(`session_colaborador:${colaborador_id}`),
    empresa: (id) => prefixedKey(`empresa:${id}`),
    empresaSubdominio: (subdominio) => prefixedKey(`empresa_subdominio:${subdominio}`),
    sucursal: (id) => prefixedKey(`sucursal:${id}`),
    sucursalPattern: () => prefixedKey('sucursal:*'),
}

export { REDIS_KEY_PREFIX, redisKeys }
