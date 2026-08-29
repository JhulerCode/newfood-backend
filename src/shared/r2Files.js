import config from '../config.js'

export function normalizeR2FileReference(file) {
    if (!file) return null

    const reference = typeof file === 'string' ? { id: file, name: file } : file
    const id = String(reference.id || '').trim()
    if (!id) return null

    return {
        id,
        name: reference.name || id,
    }
}

export function getR2ObjectUrl(id) {
    if (!id || !config.R2_PUBLIC_DOMAIN) return null

    const publicDomain = config.R2_PUBLIC_DOMAIN.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
    const objectPath = String(id).split('/').map(encodeURIComponent).join('/')
    return `https://${publicDomain}/${objectPath}`
}

export function serializeR2File(file) {
    const reference = normalizeR2FileReference(file)
    if (!reference) return null

    return {
        ...reference,
        url: getR2ObjectUrl(reference.id),
    }
}

export function serializeEmpresaFiles(empresa) {
    if (!empresa) return null

    return {
        ...empresa,
        foto: serializeR2File(empresa.foto),
    }
}

export function normalizeEmpresaFiles(empresa) {
    if (!empresa) return null

    return {
        ...empresa,
        foto: normalizeR2FileReference(empresa.foto),
    }
}
