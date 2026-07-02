import bcrypt from 'bcrypt'
import config from '../../config.js'
import jat from '#shared/jat.js'
import { guardarEmpresa, empresasStore } from '#store/empresas.js'
import { guardarSucursal } from '#store/sucursales.js'
import { guardarSesion, borrarSesion } from '#store/sessions.js'
import {
    EmpresaRepository,
    ColaboradorRepository,
    SocioRepository,
    SucursalRepository,
} from '#db/repositories.js'
import { loadSucursalImpresoraCaja } from '#core/printer/sPrinter.js'
import {
    findAccessibleSucursal,
    validateEmpresaAccess,
    validateSucursalAccess,
} from '#shared/tenantAccess.js'

const signin = async (req, res) => {
    try {
        const { usuario, contrasena } = req.body

        // --- VERIFICAR EMPRESA --- //
        const xEmpresa = req.headers['x-empresa']
        let empresa
        for (const a of empresasStore.values()) {
            if (a.subdominio === xEmpresa) {
                empresa = a
                break
            }
        }

        if (!empresa) {
            const qry = {
                fltr: {
                    subdominio: { op: 'Es', val: xEmpresa },
                },
                cols: { exclude: [] },
                incl: ['sucursales'],
            }

            const empresas = await EmpresaRepository.find(qry, true)
            if (empresas.length == 0) return res.json({ code: 1, msg: 'Empresa no encontrada' })

            empresa = empresas[0]
            empresa.clientes_varios = await loadEmpresaClienteVarios(empresa.id)
            guardarEmpresa(empresa.id, empresa)

            for (const a of empresa.sucursales) guardarSucursal(a.id, a)
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
        let sucursal = empresa.sucursales?.find((item) => item.id == colaborador.sucursal)
        if (!is_admin_subdominio && !sucursal && colaborador.sucursal) {
            const data = await SucursalRepository.find({ id: colaborador.sucursal }, true)
            if (data?.empresa == empresa.id) {
                sucursal = data
                guardarSucursal(data.id, data)
            }
        }

        if (!is_admin_subdominio) {
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
        const token = jat.encrypt({ id: colaborador.id }, config.tokenMyApi)

        delete colaborador.contrasena
        if (!is_admin_subdominio && sucursal) colaborador.sucursal = sucursal.id

        guardarSesion(colaborador.id, {
            token,
            ...colaborador,
        })
        if (!is_admin_subdominio) await loadSucursalImpresoraCaja(sucursal.id)

        res.json({ code: 0, token })
    } catch (error) {
        res.status(500).send({ code: -1, msg: error.message, error })
    }
}

const logout = async (req, res) => {
    try {
        const { id } = req.body
        borrarSesion(id)

        res.json({ code: 0 })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
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

function canChangeSucursal(colaborador) {
    return colaborador.permisos?.includes('vSucursales:cambiarSucursal') == true
}

export default {
    signin,
    logout,
}
