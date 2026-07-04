import { verifyAccessToken } from '#infrastructure/tokenService.js'
import { obtenerSesionPorId } from '#store/sessions.js'
import { obtenerEmpresa, guardarEmpresa } from '#store/empresas.js'
import { obtenerColaborador, guardarColaborador } from '#store/colaboradores.js'
import {
    getSucursalAccessNotice,
    shouldDeactivateSucursal,
    validateEmpresaAccess,
    validateSucursalAccess,
} from '#shared/tenantAccess.js'
import {
    ColaboradorRepository,
    EmpresaRepository,
    SocioRepository,
    SucursalRepository,
} from '#db/repositories.js'
import { guardarSucursal, obtenerSucursal, obtenerSucursalesPorEmpresa } from '#store/sucursales.js'

async function verifyToken(req, res, next) {
    const xEmpresa = req.headers['x-empresa']
    const xSucursal = req.headers['x-sucursal']
    const token = getAccessToken(req)

    if (!token) return res.status(401).json({ msg: 'Token faltante' })

    try {
        const user = verifyAccessToken(token)
        const session = await obtenerSesionPorId(user.session_id)
        let colaborador_changed = false

        if (!session || session.colaborador_id !== user.colaborador_id) {
            return res.status(401).json({ msg: 'Sesion no valida' })
        }

        let colaborador = await obtenerColaborador(session.colaborador_id)
        if (!colaborador) {
            colaborador = await loadColaboradorById(session.colaborador_id)
            if (!colaborador) return res.status(401).json({ msg: 'Colaborador no encontrado' })
        }

        req.user = {
            colaborador: colaborador.id,
            session_id: session.session_id,
            ...colaborador,
        }

        let empresa = await obtenerEmpresa(colaborador.empresa)
        if (!empresa) {
            empresa = await loadEmpresaById(colaborador.empresa)
            if (!empresa) {
                return res.status(401).json({ msg: 'Empresa no encontrada en sesion' })
            }
        }

        if (!xEmpresa || empresa.subdominio !== xEmpresa) {
            return res.status(401).json({ msg: 'Sesion no valida para este empresa' })
        }

        const empresa_error = validateEmpresaAccess(empresa)
        if (empresa_error) return res.status(403).json({ msg: empresa_error })

        const is_admin_subdominio = empresa.subdominio === 'admin'
        let sucursal = null

        if (!is_admin_subdominio) {
            sucursal = await loadSucursalById(xSucursal, empresa.id)

            if (shouldDeactivateSucursal(sucursal)) {
                await SucursalRepository.update({ id: sucursal.id }, { activo: false })
                sucursal.activo = false
                await guardarSucursal(sucursal.id, sucursal)
            }

            const sucursal_error = validateSucursalAccess(sucursal)
            if (sucursal_error) {
                return res.status(403).json({
                    code: 'SUCURSAL_NO_DISPONIBLE',
                    msg: sucursal_error,
                    can_change_sucursal: canChangeSucursal(colaborador),
                })
            }

            const access_notice = getSucursalAccessNotice(sucursal)
            if (JSON.stringify(colaborador.access_notice) !== JSON.stringify(access_notice)) {
                colaborador_changed = true
            }
            colaborador.access_notice = access_notice
            req.user.sucursal = sucursal.id
            req.user.access_notice = colaborador.access_notice
        }

        empresa.sucursales = await loadSucursalesByEmpresa(empresa.id)
        req.empresa = {
            ...empresa,
        }

        if (colaborador_changed) await guardarColaborador(colaborador.id, colaborador)

        req.sucursal = {
            ...sucursal,
        }

        next()
    } catch (error) {
        return res.status(401).json({ msg: 'Token invalido o expirado', error: error.message })
    }
}

function getAccessToken(req) {
    const authorization = req.headers.authorization
    if (authorization?.startsWith('Bearer ')) return authorization.substring(7)
}

function canChangeSucursal(session) {
    return session.permisos?.includes('vSucursales:cambiarSucursal') == true
}

async function loadSucursalById(id, empresa_id) {
    if (!id) return null

    let sucursal = await obtenerSucursal(id)
    if (sucursal?.empresa == empresa_id) return sucursal

    sucursal = await SucursalRepository.find({ id }, true)
    if (!sucursal || sucursal.empresa != empresa_id) return null

    return await guardarSucursal(sucursal.id, sucursal)
}

async function loadEmpresaById(id) {
    const empresa = await EmpresaRepository.find({ id, incl: ['sucursales'] }, true)
    if (!empresa) return null

    empresa.clientes_varios = await loadEmpresaClienteVarios(empresa.id)
    await guardarEmpresa(empresa.id, empresa)

    return empresa
}

async function loadSucursalesByEmpresa(empresa_id) {
    let sucursales = await obtenerSucursalesPorEmpresa(empresa_id)
    if (sucursales.length > 0) return sucursales

    sucursales = await SucursalRepository.find(
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

async function loadColaboradorById(id) {
    const colaborador = await ColaboradorRepository.find({ id }, true)
    if (!colaborador) return null

    delete colaborador.contrasena
    return await guardarColaborador(id, colaborador)
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
