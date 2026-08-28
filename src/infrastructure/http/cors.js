import config from '../../config.js'

function parseList(value, variableName) {
    if (!value) return []

    let parsed

    try {
        parsed = JSON.parse(value)
    } catch {
        throw new Error(`${variableName} debe ser un arreglo JSON válido`)
    }

    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
        throw new Error(`${variableName} debe ser un arreglo JSON de textos`)
    }

    return parsed.map((item) => item.trim()).filter(Boolean)
}

function normalizeDomain(value) {
    const domain = value.toLowerCase().replace(/^\*\./, '')

    if (
        !domain ||
        domain.includes('://') ||
        domain.includes('/') ||
        domain.includes(':') ||
        domain.startsWith('.') ||
        domain.endsWith('.')
    ) {
        throw new Error(`Dominio permitido no válido: ${value}`)
    }

    return domain
}

function normalizeOrigin(value) {
    let url

    try {
        url = new URL(value)
    } catch {
        throw new Error(`Origen permitido no válido: ${value}`)
    }

    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value) {
        throw new Error(`El origen permitido debe incluir solo protocolo, host y puerto: ${value}`)
    }

    return url.origin
}

const allowedDomains = [
    ...new Set(
        parseList(config.frontendAllowedDomains, 'FRONTEND_ALLOWED_DOMAINS').map(
            normalizeDomain,
        ),
    ),
]

const allowedOrigins = [
    ...new Set(
        [
            ...parseList(config.frontendAllowedOrigins, 'FRONTEND_ALLOWED_ORIGINS'),
            ...parseList(config.hostFrontend, 'HOST_FRONTEND'),
        ].map(normalizeOrigin),
    ),
]

function isAllowedOrigin(origin) {
    // Clientes sin Origin, como el Printer o procesos servidor a servidor,
    // no están sujetos a CORS y mantienen su autenticación habitual.
    if (!origin) return true

    let url

    try {
        url = new URL(origin)
    } catch {
        return false
    }

    if (url.origin !== origin) return false
    if (allowedOrigins.includes(url.origin)) return true
    if (url.protocol !== 'https:' || url.port) return false

    const hostname = url.hostname.toLowerCase()

    return allowedDomains.some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    )
}

function validateCorsOrigin(origin, callback) {
    if (isAllowedOrigin(origin)) {
        callback(null, true)
        return
    }

    callback(new Error('Origen no permitido por CORS'))
}

const corsOptions = {
    origin: validateCorsOrigin,
    credentials: true,
}

export { allowedDomains, allowedOrigins, isAllowedOrigin, validateCorsOrigin, corsOptions }
