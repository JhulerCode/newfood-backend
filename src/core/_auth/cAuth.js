import bcrypt from 'bcrypt'
import {
    createAccessToken,
    createRefreshToken,
    createRefreshTokenId,
    createSessionId,
    setRefreshCookie,
    clearAuthCookies,
    verifyRefreshToken,
} from '#infrastructure/tokenService.js'
import { guardarEmpresa, obtenerEmpresaPorSubdominio } from '#store/empresas.js'
import { guardarSucursal, obtenerSucursal } from '#store/sucursales.js'
import { guardarColaborador } from '#store/colaboradores.js'
import {
    guardarSesion,
    borrarSesion,
    borrarSesionPorId,
    obtenerSesionPorId,
    refreshSesion,
} from '#store/sessions.js'
import {
    EmpresaRepository,
    ColaboradorRepository,
    SocioRepository,
    SucursalRepository,
} from '#db/repositories.js'
import { loadSucursalImpresoraCaja } from '#core/printer/sPrinter.js'
import {
    findAccessibleSucursal,
    getSucursalAccessNotice,
    shouldDeactivateSucursal,
    validateEmpresaAccess,
    validateSucursalAccess,
} from '#shared/tenantAccess.js'

const signin = async (req, res) => {
    try {
        const { usuario, contrasena } = req.body

        // --- VERIFICAR EMPRESA --- //
        const xEmpresa = req.headers['x-empresa']
        let empresa = await obtenerEmpresaPorSubdominio(xEmpresa)

        if (!empresa) {
            empresa = await loadEmpresaBySubdominio(xEmpresa)
        }

        const empresa_error = validateEmpresaAccess(empresa)
        if (empresa_error) return res.json({ code: 1, msg: empresa_error })

        // --- VERIFICAR COLABORADOR --- //
        const colaborador = await loadColaboradorByUsuario(usuario, empresa.id)
        if (!colaborador) return res.json({ code: 1, msg: 'Usuario o contraseña incorrecta' })

        const is_admin_subdominio = empresa.subdominio === 'admin'

        let sucursal = null
        let sucursales = []
        console.log('ASD1')
        if (!is_admin_subdominio && colaborador.sucursal) {
            sucursal = await loadSucursalById(colaborador.sucursal, empresa.id)
        }
        console.log('ASD2')
        if (!is_admin_subdominio) {
            if (shouldDeactivateSucursal(sucursal)) {
                await SucursalRepository.update({ id: sucursal.id }, { activo: false })
                sucursal.activo = false
                await guardarSucursal(sucursal.id, sucursal)
            }

            const sucursal_error = validateSucursalAccess(sucursal)
            if (sucursal_error) {
                if (!canChangeSucursal(colaborador)) {
                    return res.json({ code: 1, msg: sucursal_error })
                }

                sucursales = await loadSucursalesByEmpresaFromDb(empresa.id)
                await deactivateExpiredSucursales(sucursales)
                sucursal = findAccessibleSucursal(sucursales)
                if (!sucursal) {
                    return res.json({ code: 1, msg: 'No hay sucursales activas disponibles' })
                }
            }
        }

        const correct = await bcrypt.compare(contrasena, colaborador.contrasena)
        if (!correct) return res.json({ code: 1, msg: 'Usuario o contraseña incorrecta' })

        // -- GUARDAR SESSION --- //
        const session_id = createSessionId()
        const refresh_token_id = createRefreshTokenId()
        const access_token = createAccessToken({
            session_id,
            colaborador_id: colaborador.id,
        })
        const refresh_token = createRefreshToken({
            session_id,
            colaborador_id: colaborador.id,
            refresh_token_id,
        })

        delete colaborador.contrasena
        if (!is_admin_subdominio && sucursal) colaborador.sucursal = sucursal.id
        const client_info = getRequestClientInfo(req)
        const colaborador_cache = {
            ...colaborador,
            access_notice: !is_admin_subdominio ? getSucursalAccessNotice(sucursal) : null,
        }

        await guardarColaborador(colaborador.id, colaborador_cache)
        await guardarSesion(colaborador.id, {
            session_id,
            refresh_token_id,
            client_info,
        })
        setRefreshCookie(res, refresh_token)
        if (!is_admin_subdominio) await loadSucursalImpresoraCaja(sucursal.id)

        res.json({ code: 0, access_token, sucursal_id: sucursal?.id || null })
    } catch (error) {
        res.status(500).send({ code: -1, msg: error.message, error })
    }
}

const logout = async (req, res) => {
    try {
        const refresh_token = req.cookies?.refresh_token

        if (refresh_token) {
            try {
                const payload = verifyRefreshToken(refresh_token)
                await borrarSesionPorId(payload.session_id)
            } catch {
                if (req.body?.id) await borrarSesion(req.body.id)
            }
        } else if (req.body?.id) {
            await borrarSesion(req.body.id)
        }

        clearAuthCookies(res)

        res.json({ code: 0 })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const refresh = async (req, res) => {
    try {
        const refresh_token = req.cookies?.refresh_token
        if (!refresh_token) return res.status(401).json({ msg: 'Token de refresco faltante' })

        const payload = verifyRefreshToken(refresh_token)
        const session = await obtenerSesionPorId(payload.session_id)

        if (!session || session.refresh_token_id !== payload.refresh_token_id) {
            return res.status(401).json({ msg: 'SesiÃ³n no vÃ¡lida' })
        }

        const refresh_token_id = createRefreshTokenId()
        await refreshSesion(payload.session_id, { refresh_token_id })

        const access_token = createAccessToken({
            session_id: payload.session_id,
            colaborador_id: payload.colaborador_id,
        })
        const next_refresh_token = createRefreshToken({
            session_id: payload.session_id,
            colaborador_id: payload.colaborador_id,
            refresh_token_id,
        })

        setRefreshCookie(res, next_refresh_token)

        res.json({ code: 0, access_token })
    } catch {
        clearAuthCookies(res)
        return res.status(401).json({ msg: 'Sesión expirada' })
    }
}

const refreshEmpresa = async (req, res) => {
    try {
        const xEmpresa = req.headers['x-empresa']
        const data = await loadEmpresaBySubdominio(xEmpresa)
        res.json({ code: 0, data })
    } catch {
        clearAuthCookies(res)
        return res.status(401).json({ msg: 'Sesión expirada' })
    }
}

async function loadEmpresaClienteVarios(empresa_id) {
    const qry = {
        fltr: {
            nombres: { op: 'Es', val: 'CLIENTES VARIOS' },
            empresa: { op: 'Es', val: empresa_id },
        },
        cols: ['doc_tipo', 'doc_numero', 'doc_nombres', 'nombres'],
    }
    const clientes = await SocioRepository.find(qry, true)
    return clientes[0]
}

async function loadEmpresaBySubdominio(subdominio) {
    const qry = {
        fltr: {
            subdominio: { op: 'Es', val: subdominio },
        },
        cols: { exclude: [] },
    }

    const empresas = await EmpresaRepository.find(qry, true)
    if (empresas.length == 0) return null

    const empresa = empresas[0]
    empresa.clientes_varios = await loadEmpresaClienteVarios(empresa.id)
    await guardarEmpresa(empresa.id, empresa)

    return empresa
}

async function loadSucursalById(id, empresa_id) {
    let sucursal = await obtenerSucursal(id)
    if (sucursal?.empresa == empresa_id) return sucursal

    sucursal = await SucursalRepository.find({ id }, true)
    if (!sucursal || sucursal.empresa != empresa_id) return null

    return await guardarSucursal(sucursal.id, sucursal)
}

async function loadSucursalesByEmpresaFromDb(empresa_id) {
    const sucursales = await SucursalRepository.find(
        {
            fltr: {
                empresa: { op: 'Es', val: empresa_id },
            },
            cols: { exclude: [] },
        },
        true,
    )

    for (const sucursal of sucursales) await guardarSucursal(sucursal.id, sucursal)

    return sucursales
}

async function loadColaboradorByUsuario(usuario, empresa_id) {
    const qry1 = {
        fltr: {
            usuario: { op: 'Es', val: usuario },
            activo: { op: 'Es', val: true },
            empresa: { op: 'Es', val: empresa_id },
        },
        cols: { exclude: [] },
    }

    const colaboradores = await ColaboradorRepository.find(qry1, true)

    if (colaboradores.length == 0) return null

    return colaboradores[0]
}

function canChangeSucursal(colaborador) {
    return colaborador.permisos?.includes('vSucursales:cambiarSucursal') == true
}

async function deactivateExpiredSucursales(sucursales) {
    for (const sucursal of sucursales || []) {
        if (!shouldDeactivateSucursal(sucursal)) continue

        await SucursalRepository.update({ id: sucursal.id }, { activo: false })
        sucursal.activo = false
        await guardarSucursal(sucursal.id, sucursal)
    }
}

function getRequestClientInfo(req) {
    const user_agent = req.get('user-agent') || req.body?.client_info?.user_agent || null
    const platform = req.get('sec-ch-ua-platform') || req.body?.client_info?.platform || null

    return {
        ...req.body?.client_info,
        ip: getRequestIp(req),
        platform,
        user_agent,
        device: parseDevice(user_agent, platform),
    }
}

function getRequestIp(req) {
    const forwarded_for = req.headers['x-forwarded-for']
    if (typeof forwarded_for === 'string' && forwarded_for.trim()) {
        return forwarded_for.split(',')[0].trim()
    }

    return req.ip || req.socket?.remoteAddress || null
}

function parseDevice(user_agent = '', platform = '') {
    const ua = user_agent.toLowerCase()
    const platform_text = `${platform || ''}`.toLowerCase()

    let type = 'desktop'
    if (/tablet|ipad/.test(ua)) type = 'tablet'
    else if (/mobile|android|iphone|ipod/.test(ua)) type = 'mobile'

    let os = 'unknown'
    if (/windows/.test(ua) || /windows/.test(platform_text)) os = 'Windows'
    else if (/android/.test(ua) || /android/.test(platform_text)) os = 'Android'
    else if (/iphone|ipad|ipod/.test(ua) || /ios/.test(platform_text)) os = 'iOS'
    else if (/mac os|macintosh/.test(ua) || /macos/.test(platform_text)) os = 'macOS'
    else if (/linux/.test(ua) || /linux/.test(platform_text)) os = 'Linux'

    let browser = 'unknown'
    if (/edg\//.test(ua)) browser = 'Edge'
    else if (/opr\//.test(ua) || /opera/.test(ua)) browser = 'Opera'
    else if (/firefox\//.test(ua)) browser = 'Firefox'
    else if (/chrome\//.test(ua) || /crios\//.test(ua)) browser = 'Chrome'
    else if (/safari\//.test(ua)) browser = 'Safari'

    return { type, os, browser }
}

export default {
    signin,
    logout,
    refresh,
    refreshEmpresa,
}
