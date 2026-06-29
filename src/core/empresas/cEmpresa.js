import sequelize from '#infrastructure/db/sequelize.js'
import {
    ColaboradorRepository,
    EmpresaRepository,
    ImpresionAreaRepository,
    PagoMetodoRepository,
    SocioRepository,
    SucursalArticuloRepository,
    SucursalComprobanteTipoRepository,
    SucursalPagoMetodoRepository,
    SucursalRepository,
} from '#db/repositories.js'
import { minioPutObject, minioRemoveObject } from '#infrastructure/minioClient.js'
import { resDeleteFalse, resUpdateFalse } from '#http/helpers.js'
import { arrayMap } from '#store/system.js'
import { actualizarEmpresa, borrarEmpresa, guardarEmpresa } from '#store/empresas.js'
import { borrarSucursal, guardarSucursal } from '#store/sucursales.js'
import bcrypt from 'bcrypt'

const feature_ids = [
    'pedidos',
    'pos',
    'mesas',
    'delivery',
    'para_llevar',
    'insumos',
    'recetas',
]

const vista_features = {
    vPedidos: 'pedidos',
    vCajaPedidos: 'pedidos',
    vReportePedidos: 'pedidos',
    vPos: 'pos',
    vSalones: 'mesas',
    vInsumos: 'insumos',
    vInventarioInsumos: 'insumos',
}

const permiso_features = {
    'vPedidos:unirMesas': 'mesas',
    'vPedidos:cambiarMesa': 'mesas',
    'vProductos:listarReceta': 'recetas',
    'vProductos:crearReceta': 'recetas',
    'vProductos:editarReceta': 'recetas',
    'vProductos:eliminarReceta': 'recetas',
}

const permisos_base = [
    'vProveedores:listar',
    'vProveedores:crear',
    'vProveedores:ver',
    'vProveedores:editar',
    'vProveedores:eliminar',
    'vCompras:listar',
    'vCompras:crear',
    'vCompras:ver',
    'vCompras:editar',
    'vCompras:eliminar',
    'vClientes:listar',
    'vClientes:crear',
    'vClientes:ver',
    'vClientes:editar',
    'vClientes:eliminar',
    'vPedidos:listar',
    'vPedidos:crear',
    'vPedidos:ver',
    'vPedidos:editar',
    'vPedidos:addProductos',
    'vPedidos:editarDetalles',
    'vPedidos:anular',
    'vPedidos:eliminar',
    'vPedidos:imprimirComanda',
    'vPedidos:imprimirPrecuenta',
    'vPedidos:generarComprobante',
    'vPedidos:verComprobantes',
    'vPedidos:entregar',
    'vPedidos:unirMesas',
    'vPedidos:cambiarMesa',
    'vPos:crear',
    'vCajaResumen:ver',
    'vCajaResumen:aperturar',
    'vCajaResumen:cerrar',
    'vCajaMovimientos:listar',
    'vCajaMovimientos:crear',
    'vCajaMovimientos:editar',
    'vCajaMovimientos:eliminar',
    'vCajaPedidos:listar',
    'vCajaPedidos:ver',
    'vCajaPedidos:verComprobantes',
    'vCajaComprobantes:listar',
    'vCajaComprobantes:ver',
    'vCajaComprobantes:anular',
    'vCajaComprobantes:canjear',
    'vCajaComprobantes:verPagos',
    'vCajaComprobantes:agregarPagos',
    'vCajaComprobantes:editarPagos',
    'vCajaComprobantes:enviarCorreo',
    'vCajaComprobantes:enviarWhatsapp',
    'vCajaComprobantes:imprimir',
    'vCajaComprobantes:descargarPdf',
    'vInventarioInsumos:listar',
    'vInventarioInsumos:kardex',
    'vInventarioInsumos:ajusteStock',
    'vInventarioProductos:listar',
    'vInventarioProductos:kardex',
    'vInventarioProductos:ajusteStock',
    'vReportePedidos:listar',
    'vReportePedidos:ver',
    'vReportePedidos:verComprobantes',
    'vReporteComprobantes:listar',
    'vReporteComprobantes:anular',
    'vReporteComprobantes:canjear',
    'vReporteComprobantes:verPagos',
    'vReporteComprobantes:agregarPagos',
    'vReporteComprobantes:editarPagos',
    'vReporteComprobantes:enviarCorreo',
    'vReporteComprobantes:enviarWhatsapp',
    'vReporteComprobantes:imprimir',
    'vReporteComprobantes:descargarPdf',
    'vReporteComprobantes:consultarEstado',
    'vComprobantesDetallado:listar',
    'vCajaAperturas:listar',
    'vCajaAperturas:verResumen',
    'vCajaAperturas:imprimirResumen',
    'vDineroMovimientos:listar',
    'vDashboard:ver',
    'vEmpresa:ver',
    'vEmpresa:editar',
    'vSucursales:listar',
    'vSucursales:crear',
    'vSucursales:ver',
    'vSucursales:editar',
    'vSucursales:eliminar',
    'vSucursales:cambiarSucursal',
    'vImpresionAreas:listar',
    'vImpresionAreas:crear',
    'vImpresionAreas:editar',
    'vImpresionAreas:eliminar',
    'vSalones:listar',
    'vSalones:crear',
    'vSalones:editar',
    'vSalones:eliminar',
    'vSalones:listarMesa',
    'vSalones:crearMesa',
    'vSalones:editarMesa',
    'vSalones:eliminarMesa',
    'vComprobanteTipos:listar',
    'vComprobanteTipos:crear',
    'vComprobanteTipos:eliminar',
    'vPagoMetodos:listar',
    'vPagoMetodos:crear',
    'vPagoMetodos:editar',
    'vPagoMetodos:eliminar',
    'vArticuloCategorias:listar',
    'vArticuloCategorias:crear',
    'vArticuloCategorias:editar',
    'vArticuloCategorias:eliminar',
    'vInsumos:listar',
    'vInsumos:crear',
    'vInsumos:editar',
    'vInsumos:eliminar',
    'vInsumos:clonar',
    'vInsumos:crearBulk',
    'vInsumos:editarBulk',
    'vInsumos:eliminarBulk',
    'vProductos:listar',
    'vProductos:crear',
    'vProductos:editar',
    'vProductos:eliminar',
    'vProductos:clonar',
    'vProductos:crearBulk',
    'vProductos:editarBulk',
    'vProductos:eliminarBulk',
    'vProductos:listarReceta',
    'vProductos:crearReceta',
    'vProductos:editarReceta',
    'vProductos:eliminarReceta',
    'vCombos:listar',
    'vCombos:crear',
    'vCombos:editar',
    'vCombos:eliminar',
    'vCombos:crearBulk',
    'vCombos:editarBulk',
    'vCombos:eliminarBulk',
    'vCombos:crearComponentesBulk',
    'vColaboradores:listar',
    'vColaboradores:crear',
    'vColaboradores:ver',
    'vColaboradores:editar',
    'vColaboradores:eliminar',
]

function normalizeFeatures(features) {
    const normalized_features = {}

    for (const feature_id of feature_ids) {
        normalized_features[feature_id] = features?.[feature_id] === true
    }

    return normalized_features
}

function hasFeature(features, feature_id) {
    return normalizeFeatures(features)[feature_id] === true
}

function getPermisoFeature(permiso_id) {
    return permiso_features[permiso_id] || vista_features[permiso_id?.split(':')?.[0]] || null
}

function getPermisosByFeatures(features) {
    return permisos_base.filter((permiso_id) => {
        const feature_id = getPermisoFeature(permiso_id)

        return !feature_id || hasFeature(features, feature_id)
    })
}

function isAdminUser(req) {
    return req.user?.permisos?.some((permiso) => permiso.startsWith('vTenants:')) == true
}

function getEmpresaPayload(body, include_admin_fields = false) {
    const payload = {
        nombre_comercial: body.nombre_comercial,
        domicilio_fiscal: body.domicilio_fiscal,
        ubigeo: body.ubigeo,
        igv_porcentaje: body.igv_porcentaje,
        telefono: body.telefono,
        correo: body.correo,
        foto: body.foto,
    }

    if (include_admin_fields) {
        payload.tipo = body.tipo
        payload.ruc = body.ruc
        payload.razon_social = body.razon_social
        payload.subdominio = body.subdominio
        payload.activo = body.activo === true
        payload.features = normalizeFeatures(body.features)
    }

    return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined))
}

async function syncSucursales(empresa_id, sucursales = [], colaborador) {
    const actuales = await SucursalRepository.find(
        { fltr: { empresa: { op: 'Es', val: empresa_id } }, cols: { exclude: [] } },
        true,
    )
    const enviados_ids = sucursales.filter((sucursal) => sucursal.id).map((sucursal) => sucursal.id)

    for (const actual of actuales) {
        if (!enviados_ids.includes(actual.id)) {
            await SucursalRepository.delete({ id: actual.id })
            borrarSucursal(actual.id)
        }
    }

    for (const sucursal of sucursales) {
        const data = {
            codigo: sucursal.codigo,
            direccion: sucursal.direccion,
            telefono: sucursal.telefono,
            correo: sucursal.correo,
            activo: sucursal.activo === true,
            empresa: empresa_id,
        }

        if (sucursal.id) {
            await SucursalRepository.update(
                { id: sucursal.id, empresa: empresa_id },
                { ...data, updatedBy: colaborador },
            )
            guardarSucursal(sucursal.id, { id: sucursal.id, ...data })
        } else {
            const nuevo = await SucursalRepository.create({ ...data, createdBy: colaborador })
            guardarSucursal(nuevo.id, nuevo.toJSON())
        }
    }
}

async function createSucursalBase(empresa_id, sucursal, colaborador, transaction) {
    const nuevo = await SucursalRepository.create(
        {
            codigo: sucursal.codigo,
            direccion: sucursal.direccion,
            telefono: sucursal.telefono,
            correo: sucursal.correo,
            activo: sucursal.activo === true,
            empresa: empresa_id,
            createdBy: colaborador,
        },
        transaction,
    )

    await ImpresionAreaRepository.create(
        {
            nombre: 'CAJA',
            impresora_tipo: '1',
            impresora: 'CAJA',
            activo: true,
            sucursal: nuevo.id,
            empresa: empresa_id,
            createdBy: colaborador,
        },
        transaction,
    )

    return nuevo
}

async function createEmpresaBaseDatos(empresa, colaborador, transaction) {
    const sucursal = await createSucursalBase(
        empresa.id,
        {
            codigo: 'PR001',
            activo: true,
        },
        colaborador,
        transaction,
    )

    const pago_metodo = await PagoMetodoRepository.create(
        {
            nombre: 'EFECTIVO',
            color: '#04E06B',
            activo: true,
            empresa: empresa.id,
            createdBy: colaborador,
        },
        transaction,
    )

    await SucursalPagoMetodoRepository.create(
        {
            sucursal: sucursal.id,
            pago_metodo: pago_metodo.id,
            estado: true,
            empresa: empresa.id,
            createdBy: colaborador,
        },
        transaction,
    )

    await SocioRepository.create(
        {
            tipo: 2,
            doc_tipo: '0',
            doc_numero: '00000000',
            nombres: 'CLIENTES VARIOS',
            activo: true,
            empresa: empresa.id,
            createdBy: colaborador,
        },
        transaction,
    )

    await ColaboradorRepository.create(
        {
            nombres: 'ADMINISTRADOR',
            apellidos: '',
            cargo: 'ADMINISTRADOR',
            activo: true,
            has_signin: true,
            usuario: 'admin',
            contrasena: await bcrypt.hash(empresa.ruc, 10),
            permisos: getPermisosByFeatures(empresa.features),
            vista_inicial: 'vEmpresa',
            sucursal: sucursal.id,
            empresa: empresa.id,
            createdBy: colaborador,
        },
        transaction,
    )
}

async function loadOne(id) {
    const data = await EmpresaRepository.find({ id }, true)
    if (!data) return null

    data.sucursales = await SucursalRepository.find(
        {
            fltr: { empresa: { op: 'Es', val: id } },
            cols: { exclude: [] },
            ordr: [['codigo', 'ASC']],
        },
        true,
    )

    const activo_estadosMap = arrayMap('activo_estados')
    data.activo1 = activo_estadosMap[data.activo]
    for (const sucursal of data.sucursales) sucursal.activo1 = activo_estadosMap[sucursal.activo]

    return data
}

const find = async (req, res) => {
    try {
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        if (!isAdminUser(req)) return res.status(403).json({ msg: 'Acceso denegado' })

        // qry.fltr.empresa = { op: 'Es', val: empresa }

        let data = await EmpresaRepository.find(qry, true)

        // if (data.length > 0) {
        //     const activo_estadosMap = arrayMap('activo_estados')

        //     for (const a of data) {
        //         if (qry?.cols?.includes('activo')) a.activo1 = activo_estadosMap[a.activo]
        //     }
        // }

        const activo_estadosMap = arrayMap('activo_estados')
        for (const item of data) item.activo1 = activo_estadosMap[item.activo]

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const findById = async (req, res) => {
    try {
        const { id } = req.params
        const can_admin = isAdminUser(req)
        const data = can_admin ? await loadOne(id) : req.empresa

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const update = async (req, res) => {
    try {
        const { colaborador } = req.user
        const { id } = req.params

        if (req.body.datos) {
            const datos = JSON.parse(req.body.datos)
            req.body = { ...datos }
        }

        const can_admin = isAdminUser(req)
        if (!can_admin && id != req.user.empresa) {
            return res.status(403).json({ msg: 'Acceso denegado' })
        }

        if (can_admin) {
            if (
                (await EmpresaRepository.existe(
                    { ruc: req.body.ruc, id },
                    res,
                    'El RUC ya existe',
                )) == true
            ) {
                return
            }
            if (
                (await EmpresaRepository.existe(
                    { subdominio: req.body.subdominio, id },
                    res,
                    'El subdominio ya existe',
                )) == true
            ) {
                return
            }
        }

        //--- Subir archivo ---//
        let newFile
        if (req.file) {
            newFile = await minioPutObject(req.file)

            if (newFile == false) {
                res.status(500).json({ code: 1, msg: 'Error al subir el archivo' })
                return
            }
        }

        const send = {
            ...getEmpresaPayload(req.body, can_admin),
            foto: newFile || req.body.foto,
            updatedBy: colaborador,
        }

        // ----- ACTUALIZAR ----- //
        const updated = await EmpresaRepository.update({ id }, send)

        if (updated == false) return resUpdateFalse(res)

        //--- Eliminar archivo de minio ---//
        if (req.file && req.body.foto?.id) await minioRemoveObject(req.body.foto.id)

        if (can_admin) await syncSucursales(id, req.body.sucursales || [], colaborador)

        const data = await loadOne(id)
        actualizarEmpresa(id, data)

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const create = async (req, res) => {
    let transaction
    try {
        const { colaborador } = req.user
        const send = {
            ...getEmpresaPayload(req.body, true),
            features: normalizeFeatures(req.body.features),
        }

        if ((await EmpresaRepository.existe({ ruc: send.ruc }, res, 'El RUC ya existe')) == true) {
            return
        }
        if (
            (await EmpresaRepository.existe(
                { subdominio: send.subdominio },
                res,
                'El subdominio ya existe',
            )) == true
        ) {
            return
        }

        transaction = await sequelize.transaction()

        const nuevo = await EmpresaRepository.create(send, transaction)
        await createEmpresaBaseDatos(nuevo.toJSON(), colaborador, transaction)

        await transaction.commit()

        const data = await loadOne(nuevo.id)
        guardarEmpresa(nuevo.id, data)

        res.json({ code: 0, data })
    } catch (error) {
        if (transaction) await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const delet = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { id } = req.params

        const sucursales = await SucursalRepository.find(
            { fltr: { empresa: { op: 'Es', val: id } }, cols: ['id'] },
            true,
        )

        for (const sucursal of sucursales) {
            await SucursalArticuloRepository.delete({ sucursal: sucursal.id }, transaction)
            await ImpresionAreaRepository.delete({ sucursal: sucursal.id }, transaction)
            await SucursalPagoMetodoRepository.delete({ sucursal: sucursal.id }, transaction)
            await SucursalComprobanteTipoRepository.delete({ sucursal: sucursal.id }, transaction)
            await SucursalRepository.delete({ id: sucursal.id }, transaction)
            borrarSucursal(sucursal.id)
        }

        await PagoMetodoRepository.delete({ empresa: id }, transaction)
        await SocioRepository.delete({ empresa: id }, transaction)
        await ColaboradorRepository.delete({ empresa: id }, transaction)

        if ((await EmpresaRepository.delete({ id }, transaction)) == false) {
            await transaction.rollback()
            return resDeleteFalse(res)
        }

        await transaction.commit()

        borrarEmpresa(id)

        res.json({ code: 0 })
    } catch (error) {
        await transaction.rollback()

        res.status(500).json({
            code: -1,
            msg: 'No se puede eliminar la empresa porque ya tiene datos relacionados',
            error,
        })
    }
}

const findSucursales = async (req, res) => {
    try {
        const { empresa_id } = req.params
        const qry = req.query.qry ? JSON.parse(req.query.qry) : { fltr: {}, cols: { exclude: [] } }

        qry.fltr = qry.fltr || {}
        qry.fltr.empresa = { op: 'Es', val: empresa_id }

        const data = await SucursalRepository.find(qry, true)
        const activo_estadosMap = arrayMap('activo_estados')
        for (const item of data) item.activo1 = activo_estadosMap[item.activo]

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const findSucursalById = async (req, res) => {
    try {
        const { empresa_id, sucursal_id } = req.params
        const data = await SucursalRepository.find({ id: sucursal_id }, true)

        if (!data || data.empresa != empresa_id) return res.json({ code: 1, msg: 'No encontrado' })

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const createSucursal = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador } = req.user
        const { empresa_id } = req.params

        if (
            (await SucursalRepository.existe(
                { codigo: req.body.codigo, empresa: empresa_id },
                res,
                'El codigo ya existe',
            )) == true
        ) {
            await transaction.rollback()
            return
        }

        const nuevo = await createSucursalBase(
            empresa_id,
            {
                codigo: req.body.codigo,
                direccion: req.body.direccion,
                telefono: req.body.telefono,
                correo: req.body.correo,
                activo: req.body.activo,
            },
            colaborador,
            transaction,
        )

        const pago_metodos = await PagoMetodoRepository.find(
            { fltr: { empresa: { op: 'Es', val: empresa_id } }, cols: ['id'] },
            true,
        )
        if (pago_metodos.length > 0) {
            await SucursalPagoMetodoRepository.createBulk(
                pago_metodos.map((pago_metodo) => ({
                    sucursal: nuevo.id,
                    pago_metodo: pago_metodo.id,
                    estado: true,
                    empresa: empresa_id,
                    createdBy: colaborador,
                })),
                transaction,
            )
        }

        await transaction.commit()

        const data = await SucursalRepository.find({ id: nuevo.id }, true)
        guardarSucursal(nuevo.id, data)

        res.json({ code: 0, data })
    } catch (error) {
        await transaction.rollback()
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const updateSucursal = async (req, res) => {
    try {
        const { colaborador } = req.user
        const { empresa_id, sucursal_id } = req.params
        const { codigo, direccion, telefono, correo, activo } = req.body

        if (
            (await SucursalRepository.existe(
                { codigo, id: sucursal_id, empresa: empresa_id },
                res,
                'El codigo ya existe',
            )) == true
        ) {
            return
        }

        const updated = await SucursalRepository.update(
            { id: sucursal_id, empresa: empresa_id },
            {
                codigo,
                direccion,
                telefono,
                correo,
                activo: activo === true,
                updatedBy: colaborador,
            },
        )

        if (updated == false) return resUpdateFalse(res)

        const data = await SucursalRepository.find({ id: sucursal_id }, true)
        guardarSucursal(sucursal_id, data)

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const deleteSucursal = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { empresa_id, sucursal_id } = req.params

        await SucursalArticuloRepository.delete({ sucursal: sucursal_id, empresa: empresa_id }, transaction)
        await ImpresionAreaRepository.delete({ sucursal: sucursal_id, empresa: empresa_id }, transaction)
        await SucursalPagoMetodoRepository.delete({ sucursal: sucursal_id, empresa: empresa_id }, transaction)
        await SucursalComprobanteTipoRepository.delete({ sucursal: sucursal_id, empresa: empresa_id }, transaction)

        if ((await SucursalRepository.delete({ id: sucursal_id, empresa: empresa_id }, transaction)) == false) {
            await transaction.rollback()
            return resDeleteFalse(res)
        }

        await transaction.commit()

        borrarSucursal(sucursal_id)

        res.json({ code: 0 })
    } catch (error) {
        await transaction.rollback()

        res.status(500).json({
            code: -1,
            msg: 'No se puede eliminar la sucursal porque ya tiene datos relacionados',
            error,
        })
    }
}

// const updateCdt = async (req, res) => {
//     try {
//         const { colaborador } = req.user
//         const { id } = req.params

//         if (req.body.datos) {
//             const datos = JSON.parse(req.body.datos)
//             req.body = { ...datos }
//         }

//         const {
//             cdt, cdt_clave,
//         } = req.body

//         // --- ACTUALIZAR --- //
//         const send = {
//             cdt, cdt_clave,
//             updatedBy: colaborador
//         }

//         if (req.file) send.cdt = req.file.filename

//         const [affectedRows] = await Empresa.update(
//             send,
//             {
//                 where: { id },
//             }
//         )

//         if (affectedRows > 0) {
//             // if (send.cdt != previous_cdt && previous_cdt != null) {
//             //     deleteFile(previous_cdt)
//             // }
//             if (req.file) {
//                 convertToPem(req.file.filename)
//             }

//             res.json({ code: 0 })
//         }
//         else {
//             res.json({ code: 1, msg: 'No se actualizó ningún registro' })
//         }
//     }
//     catch (error) {
//         res.status(500).json({ code: -1, msg: error.message, error })
//     }
// }

// function convertToPem(fileName) {
//     // === 1. Cargar PFX ===
//     const ruta = path.join(pathSunat, fileName)
//     const pfxData = fs.readFileSync(ruta, "binary")
//     const password = "2801"

//     const p12Asn1 = forge.asn1.fromDer(pfxData)
//     const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password)

//     // === 2. Extraer clave y certificado ===
//     let privateKeyPem, certificatePem

//     for (const safeContent of p12.safeContents) {
//         for (const safeBag of safeContent.safeBags) {
//             if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag) {
//                 // Convertir clave a PKCS#8
//                 privateKeyPem = forge.pki.privateKeyInfoToPem(
//                     forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(safeBag.key))
//                 )
//                 // Convertir clave a PKCS#1
//                 // privateKeyPem = forge.pki.privateKeyToPem(safeBag.key)
//             } else if (safeBag.type === forge.pki.oids.certBag) {
//                 certificatePem = forge.pki.certificateToPem(safeBag.cert)
//             }
//         }
//     }

//     // === 3. Guardar archivos ===
//     const rutaCert = path.join(pathSunat, './cert.pem')
//     const rutaKey = path.join(pathSunat, './private_key.pem')
//     fs.writeFileSync(rutaCert, certificatePem)
//     fs.writeFileSync(rutaKey, privateKeyPem)

//     console.log("✅ Clave y certificado extraídos correctamente")
// }

export default {
    find,
    findById,
    create,
    update,
    delet,
    findSucursales,
    findSucursalById,
    createSucursal,
    updateSucursal,
    deleteSucursal,
    // updateCdt
}
