import bcrypt from 'bcrypt'
import {
    createAccessToken,
    createRefreshToken,
    createRefreshTokenId,
    createSessionId,
    setAuthCookies,
    clearAuthCookies,
    verifyRefreshToken,
} from '#infrastructure/tokenService.js'
import { guardarEmpresa, obtenerEmpresaPorSubdominio } from '#store/empresas.js'
import { guardarSucursal } from '#store/sucursales.js'
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
            if (!empresa) return res.json({ code: 1, msg: 'Empresa no encontrada' })
        }

        const empresa_error = validateEmpresaAccess(empresa)
        if (empresa_error) return res.json({ code: 1, msg: empresa_error })

        // --- VERIFICAR COLABORADOR --- //
        const qry1 = {
            fltr: {
                usuario: { op: 'Es', val: usuario },
                activo: { op: 'Es', val: true },
                empresa: { op: 'Es', val: empresa.id },
            },
            cols: { exclude: [] },
        }

        const colaboradores = await ColaboradorRepository.find(qry1, true)
        if (colaboradores.length == 0)
            return res.json({ code: 1, msg: 'Usuario o contraseña incorrecta' })

        const colaborador = colaboradores[0]

        const is_admin_subdominio = empresa.subdominio === 'admin'
        if (!is_admin_subdominio) await deactivateExpiredSucursales(empresa)

        let sucursal = empresa.sucursales?.find((item) => item.id == colaborador.sucursal)
        if (!is_admin_subdominio && !sucursal && colaborador.sucursal) {
            const data = await SucursalRepository.find({ id: colaborador.sucursal }, true)
            if (data?.empresa == empresa.id) {
                sucursal = data
                await guardarSucursal(data.id, data)
            }
        }

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

                sucursal = findAccessibleSucursal(empresa.sucursales)
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

        await guardarSesion(colaborador.id, {
            session_id,
            refresh_token_id,
            ...colaborador,
            access_notice: !is_admin_subdominio ? getSucursalAccessNotice(sucursal) : null,
        })
        setAuthCookies(res, { access_token, refresh_token })
        if (!is_admin_subdominio) await loadSucursalImpresoraCaja(sucursal.id)

        res.json({ code: 0 })
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

        setAuthCookies(res, { access_token, refresh_token: next_refresh_token })

        res.json({ code: 0 })
    } catch {
        clearAuthCookies(res)
        return res.status(401).json({ msg: 'SesiÃ³n expirada' })
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
        incl: ['sucursales'],
    }

    const empresas = await EmpresaRepository.find(qry, true)
    if (empresas.length == 0) return null

    const empresa = empresas[0]
    empresa.clientes_varios = await loadEmpresaClienteVarios(empresa.id)
    await guardarEmpresa(empresa.id, empresa)

    for (const sucursal of empresa.sucursales) await guardarSucursal(sucursal.id, sucursal)

    return empresa
}

function canChangeSucursal(colaborador) {
    return colaborador.permisos?.includes('vSucursales:cambiarSucursal') == true
}

async function deactivateExpiredSucursales(empresa) {
    for (const sucursal of empresa.sucursales || []) {
        if (!shouldDeactivateSucursal(sucursal)) continue

        await SucursalRepository.update({ id: sucursal.id }, { activo: false })
        sucursal.activo = false
        await guardarSucursal(sucursal.id, sucursal)
    }
}

export default {
    signin,
    logout,
    refresh,
}
