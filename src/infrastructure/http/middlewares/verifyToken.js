import jat from '#shared/jat.js'
import config from '../../../config.js'
import { obtenerSesion } from '#store/sessions.js'
import { obtenerEmpresa } from '#store/empresas.js'
import {
    findAccessibleSucursal,
    validateEmpresaAccess,
    validateSucursalAccess,
} from '#shared/tenantAccess.js'
import { SucursalRepository } from '#db/repositories.js'
import { guardarSucursal } from '#store/sucursales.js'

async function verifyToken(req, res, next) {
    const authorization = req.headers['authorization']
    const xEmpresa = req.headers['x-empresa']
    const xSucursal = req.headers['x-sucursal']

    if (!authorization) return res.status(401).json({ msg: 'Token faltante' })

    if (!authorization.toLowerCase().startsWith('bearer'))
        return res.status(401).json({ msg: 'Token no válido' })

    const token = authorization.substring(7)

    try {
        const user = jat.decrypt(token, config.tokenMyApi)
        const session = obtenerSesion(user.id)

        if (!session || session.token !== token) {
            return res.status(401).json({ msg: 'Sesión no válida' })
        }

        req.user = {
            colaborador: session.id,
            ...session,
        }

        const empresa = obtenerEmpresa(session.empresa)
        if (!empresa) {
            return res.status(401).json({ msg: 'Empresa no encontrada en sesion' })
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
        const sucursales = empresa.sucursales || []
        let sucursal =
            sucursales.find((s) => s.id == xSucursal) ||
            sucursales.find((s) => s.id == session.sucursal)

        if (!is_admin_subdominio && !sucursal && session.sucursal) {
            const data = await SucursalRepository.find({ id: session.sucursal }, true)
            if (data?.empresa == empresa.id) {
                sucursal = data
                guardarSucursal(data.id, data)
            }
        }

        if (!is_admin_subdominio) {
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
            }
        }

        req.sucursal = {
            ...sucursal,
        }

        next()
    } catch (error) {
        return res.status(401).json({ msg: 'Token inválido o expirado' })
    }
}

function canChangeSucursal(session) {
    return session.permisos?.includes('vSucursales:cambiarSucursal') == true
}

export default verifyToken
