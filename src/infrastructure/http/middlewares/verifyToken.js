import { verifyAccessToken } from '#infrastructure/tokenService.js'
import { obtenerSesionPorId, refreshSesion } from '#store/sessions.js'
import { obtenerEmpresa, guardarEmpresa } from '#store/empresas.js'
import {
    findAccessibleSucursal,
    getSucursalAccessNotice,
    shouldDeactivateSucursal,
    validateEmpresaAccess,
    validateSucursalAccess,
} from '#shared/tenantAccess.js'
import { EmpresaRepository, SocioRepository, SucursalRepository } from '#db/repositories.js'
import { guardarSucursal } from '#store/sucursales.js'

async function verifyToken(req, res, next) {
    const xEmpresa = req.headers['x-empresa']
    const xSucursal = req.headers['x-sucursal']
    const token = req.cookies?.access_token

    if (!token) return res.status(401).json({ msg: 'Token faltante' })

    try {
        const user = verifyAccessToken(token)
        const session = await obtenerSesionPorId(user.session_id)
        let session_changed = false

        if (!session || session.colaborador_id !== user.colaborador_id) {
            return res.status(401).json({ msg: 'Sesion no valida' })
        }

        req.user = {
            colaborador: session.id,
            ...session,
        }

        let empresa = await obtenerEmpresa(session.empresa)
        if (!empresa) {
            empresa = await loadEmpresaById(session.empresa)
            if (!empresa) {
                return res.status(401).json({ msg: 'Empresa no encontrada en sesion' })
            }
        }

        if (!xEmpresa || empresa.subdominio !== xEmpresa) {
            return res.status(401).json({ msg: 'Sesion no valida para este empresa' })
        }

        const empresa_error = validateEmpresaAccess(empresa)
        if (empresa_error) return res.status(403).json({ msg: empresa_error })

        req.empresa = {
            ...empresa,
        }

        const is_admin_subdominio = empresa.subdominio === 'admin'
        if (!is_admin_subdominio) await deactivateExpiredSucursales(empresa)

        const sucursales = empresa.sucursales || []
        let sucursal =
            sucursales.find((s) => s.id == xSucursal) ||
            sucursales.find((s) => s.id == session.sucursal)

        if (!is_admin_subdominio && !sucursal && session.sucursal) {
            const data = await SucursalRepository.find({ id: session.sucursal }, true)
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
                if (!canChangeSucursal(session)) {
                    return res.status(403).json({ msg: sucursal_error })
                }

                sucursal = findAccessibleSucursal(sucursales)
                if (!sucursal) {
                    return res.status(403).json({ msg: 'No hay sucursales activas disponibles' })
                }

                session.sucursal = sucursal.id
                req.user.sucursal = sucursal.id
                session_changed = true
            }

            const access_notice = getSucursalAccessNotice(sucursal)
            if (JSON.stringify(session.access_notice) !== JSON.stringify(access_notice)) {
                session_changed = true
            }
            session.access_notice = access_notice
            req.user.access_notice = session.access_notice
        }

        if (session_changed) await refreshSesion(session.session_id, session)

        req.sucursal = {
            ...sucursal,
        }

        next()
    } catch {
        return res.status(401).json({ msg: 'Token invalido o expirado' })
    }
}

function canChangeSucursal(session) {
    return session.permisos?.includes('vSucursales:cambiarSucursal') == true
}

async function deactivateExpiredSucursales(empresa) {
    for (const sucursal of empresa.sucursales || []) {
        if (!shouldDeactivateSucursal(sucursal)) continue

        await SucursalRepository.update({ id: sucursal.id }, { activo: false })
        sucursal.activo = false
        await guardarSucursal(sucursal.id, sucursal)
    }
}

async function loadEmpresaById(id) {
    const empresa = await EmpresaRepository.find({ id, incl: ['sucursales'] }, true)
    if (!empresa) return null

    empresa.clientes_varios = await loadEmpresaClienteVarios(empresa.id)
    await guardarEmpresa(empresa.id, empresa)

    for (const sucursal of empresa.sucursales || []) await guardarSucursal(sucursal.id, sucursal)

    return empresa
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

export default verifyToken
