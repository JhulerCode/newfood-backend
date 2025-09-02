import { CajaApertura } from '../../database/models/CajaApertura.js'
import { Colaborador } from '../../database/models/Colaborador.js'
import { Comprobante, ComprobanteItem } from '../../database/models/Comprobante.js'
import { DineroMovimiento } from '../../database/models/DineroMovimiento.js'
import { PagoMetodo } from '../../database/models/PagoMetodo.js'
import { Transaccion } from '../../database/models/Transaccion.js'
import { applyFilters } from '../../utils/mine.js'
import cSistema from '../_sistema/cSistema.js'

const include1 = {
    pago_metodo1: {
        model: PagoMetodo,
        as: 'pago_metodo1',
        attributes: ['id', 'nombre'],
    },
    comprobante1: {
        model: Comprobante,
        as: 'comprobante1',
        attributes: ['id', 'venta_fecha_emision', 'venta_serie', 'venta_numero', 'serie_correlativo', 'monto'],
    },
    transaccion1: {
        model: Transaccion,
        as: 'transaccion1',
        attributes: ['id', 'fecha', 'monto', 'venta_canal'],
    },
    caja_apertura1: {
        model: CajaApertura,
        as: 'caja_apertura1',
        attributes: ['id', 'fecha_apertura', 'fecha_apertura'],
    },
    createdBy1: {
        model: Colaborador,
        as: 'createdBy1',
        attributes: ['id', 'nombres', 'apellidos', 'nombres_apellidos'],
    },
}

const find = async (req, res) => {
    try {
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        const findProps = {
            attributes: ['id'],
            order: [['createdAt', 'DESC']],
            where: {},
            include: [],
        }

        if (qry) {
            if (qry.incl) {
                for (const a of qry.incl) {
                    if (qry.incl.includes(a)) findProps.include.push(include1[a])
                }
            }

            if (qry.fltr) {
                Object.assign(findProps.where, applyFilters(qry.fltr))
            }

            if (qry.cols) {
                findProps.attributes = findProps.attributes.concat(qry.cols)
            }
        }

        let data = await DineroMovimiento.findAll(findProps)

        if (data.length > 0) {
            data = data.map(a => a.toJSON())

            const caja_operacion_tiposMap = cSistema.arrayMap('caja_operacion_tipos')
            const caja_operacionesMap = cSistema.arrayMap('caja_operaciones')

            for (const a of data) {
                if (qry.cols.includes('tipo')) a.tipo1 = caja_operacion_tiposMap[a.tipo]
                if (qry.cols.includes('operacion')) a.operacion1 = caja_operacionesMap[a.operacion]
            }
        }

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const create = async (req, res) => {
    try {
        const { colaborador } = req.user
        const {
            fecha, tipo, operacion, detalle,
            pago_metodo, monto,
            comrpobante, Transaccion, caja_apertura } = req.body

        // ----- CREAR ----- //
        const nuevo = await DineroMovimiento.create({
            fecha, tipo, operacion, detalle,
            pago_metodo, monto,
            comrpobante, Transaccion, caja_apertura,
            createdBy: colaborador
        })

        const data = await loadOne(nuevo.id)

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

async function loadOne(id) {
    let data = await DineroMovimiento.findByPk(id, {
        include: [include1.pago_metodo1]
    })

    if (data) {
        data = data.toJSON()

        const caja_operacion_tiposMap = cSistema.arrayMap('caja_operacion_tipos')
        const caja_operacionesMap = cSistema.arrayMap('caja_operaciones')

        data.tipo1 = caja_operacion_tiposMap[data.tipo]
        data.operacion1 = caja_operacionesMap[data.operacion]
    }

    return data
}

// const update = async (req, res) => {
//     try {
//         const { id } = req.params
//         const { colaborador } = req.user
//         const { fecha, detalle, monto } = req.body

//         // ----- ACTUALIZAR ----- //
//         const [affectedRows] = await DineroMovimiento.update(
//             {
//                 fecha, detalle, monto,
//                 updatedBy: colaborador
//             },
//             { where: { id } }
//         )

//         if (affectedRows > 0) {
//             const data = await DineroMovimiento.findByPk(id)

//             res.json({ code: 0, data })
//         }
//         else {
//             res.json({ code: 1, msg: 'No se actualizó ningú registro' })
//         }
//     }
//     catch (error) {
//         res.status(500).json({ code: -1, msg: error.message, error })
//     }
// }

const delet = async (req, res) => {
    try {
        const { id } = req.params

        const deletedCount = await DineroMovimiento.destroy({ where: { id } })

        const send = deletedCount > 0 ? { code: 0 } : { code: 1, msg: 'No se eliminó ningún registro' }

        res.json(send)
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const findResumen = async (req, res) => {
    try {
        const { id } = req.params

        const findProps = {
            attributes: ['id', 'tipo', 'operacion', 'detalle', 'pago_metodo', 'monto'],
            order: [['createdAt', 'DESC']],
            where: {
                caja_apertura: id,
            },
            include: [
                {
                    model: PagoMetodo,
                    as: 'pago_metodo1',
                    attributes: ['id', 'nombre'],
                },
                {
                    model: Transaccion,
                    as: 'transaccion1',
                    attributes: ['id', 'fecha', 'monto', 'venta_canal'],
                },
                {
                    model: Comprobante,
                    as: 'comprobante1',
                    attributes: ['id', 'venta_tipo_documento_codigo', 'venta_serie', 'venta_numero', 'serie_correlativo', 'monto', 'estado'],
                    include: {
                        model: ComprobanteItem,
                        as: 'comprobante_items',
                        attributes: ['id', 'articulo', 'producto', 'pu', 'descuento_tipo', 'descuento_valor', 'cantidad'],
                    }
                },
            ]
        }

        let data = await DineroMovimiento.findAll(findProps)
        let send = {}

        if (data.length > 0) {
            data = data.map(a => a.toJSON())

            const venta_canalesMap = cSistema.arrayMap('venta_canales')
            const caja_operacionesMap = cSistema.arrayMap('caja_operaciones')
            const pago_comprobantesMap = cSistema.arrayMap('pago_comprobantes')

            const efectivo_ingresos = []
            let efectivo_ingresos_total = 0
            let efectivo_ingresos_extra_total = 0

            const efectivo_egresos = []
            let efectivo_egresos_total = 0

            let ventas_total = 0
            let descuentos_total = 0

            const venta_pago_metodos = []
            const venta_canales = []
            const venta_comprobantes = []
            const comprobantes_aceptados = []
            const comprobantes_anulados = []
            let comprobantes_aceptados_total = 0
            let comprobantes_anulados_total = 0
            const productos = []
            const productos_anulados = []
            // let productos_anulados_total = 0

            for (const a of data) {
                if (a.tipo == 2) {
                    if (a.pago_metodo == 1) {
                        efectivo_egresos_total += Number(a.monto)

                        efectivo_egresos.push({
                            id: a.id,
                            operacion: caja_operacionesMap[a.operacion].nombre,
                            detalle: a.detalle,
                            monto: Number(a.monto),
                        })
                    }
                }

                if (a.tipo == 1) {
                    if (a.pago_metodo == 1) {
                        efectivo_ingresos_total += Number(a.monto)

                        if (a.operacion != 1) {
                            efectivo_ingresos_extra_total += Number(a.monto)

                            efectivo_ingresos.push({
                                id: a.id,
                                operacion: caja_operacionesMap[a.operacion].nombre,
                                detalle: a.detalle,
                                monto: Number(a.monto),
                            })
                        }
                    }

                    if (a.transaccion1) {
                        ventas_total += Number(a.monto)

                        const j = venta_canales.findIndex(b => b.id == a.transaccion1.venta_canal)
                        if (j === -1) {
                            venta_canales.push({
                                id: a.transaccion1.venta_canal,
                                nombre: venta_canalesMap[a.transaccion1.venta_canal].nombre,
                                monto: Number(a.monto),
                                cantidad: 1
                            })
                        }
                        else {
                            venta_canales[j].monto += Number(a.monto)
                            venta_canales[j].cantidad++
                        }
                    }

                    if (a.comprobante1) {
                        ///// ----- ANULADOS ----- /////
                        if (a.comprobante1.estado == 0) {
                            comprobantes_anulados_total += Number(a.comprobante1.monto)

                            ///// ----- COMPROBANTES ----- /////
                            const j = comprobantes_anulados.findIndex(b => b.id == a.comprobante1.serie_correlativo)
                            if (j === -1) {
                                comprobantes_anulados.push({
                                    id: a.comprobante1.serie_correlativo,
                                    tipo: pago_comprobantesMap[a.comprobante1.venta_tipo_documento_codigo].nombre,
                                    monto: Number(a.comprobante1.monto),
                                })
                            }
                            else {
                                comprobantes_anulados[i].monto += Number(a.comprobante1.monto)
                            }

                            ///// ----- PRODUCTOS ----- /////
                            for (const b of a.comprobante1.comprobante_items) {
                                const k = productos_anulados.findIndex(c => c.id == b.articulo)
                                const send = calcularUno({
                                    pu: Number(b.pu),
                                    descuento_tipo: b.descuento_tipo,
                                    descuento_valor: b.descuento_valor,
                                    cantidad: Number(b.cantidad),
                                })

                                // descuentos_total += send.descuento

                                if (k === -1) {
                                    productos_anulados.push({
                                        id: b.articulo,
                                        nombre: b.producto,
                                        cantidad: Number(b.cantidad),
                                        monto: send.total,
                                        descuento: send.descuento == 0 ? null : send.descuento,
                                    })
                                }
                                else {
                                    productos_anulados[k].cantidad += Number(b.cantidad)
                                    productos_anulados[k].monto += send.total
                                    productos_anulados[k].descuento += send.descuento == 0 ? null : send.descuento
                                }
                            }
                        }

                        ///// ----- ACEPTADOS ----- /////
                        if (a.comprobante1.estado == 1) {
                            comprobantes_aceptados_total += Number(a.comprobante1.monto)

                            ///// ----- TIPOS DE COMPROBANTES ----- /////
                            const i = venta_comprobantes.findIndex(b => b.id == a.comprobante1.venta_tipo_documento_codigo)
                            if (i === -1) {
                                venta_comprobantes.push({
                                    id: a.comprobante1.venta_tipo_documento_codigo,
                                    nombre: pago_comprobantesMap[a.comprobante1.venta_tipo_documento_codigo].nombre,
                                    monto: Number(a.comprobante1.monto),
                                    cantidad: 1
                                })
                            }
                            else {
                                venta_comprobantes[i].monto += Number(a.comprobante1.monto)
                                venta_comprobantes[i].cantidad++
                            }

                            ///// ----- COMPROBANTES ----- /////
                            const j = comprobantes_aceptados.findIndex(b => b.id == a.comprobante1.serie_correlativo)
                            if (j === -1) {
                                comprobantes_aceptados.push({
                                    id: a.comprobante1.serie_correlativo,
                                    tipo: pago_comprobantesMap[a.comprobante1.venta_tipo_documento_codigo].nombre,
                                    monto: Number(a.comprobante1.monto),
                                })
                            }
                            else {
                                comprobantes_aceptados[i].monto += Number(a.comprobante1.monto)
                            }

                            ///// ----- PRODUCTOS ----- /////
                            for (const b of a.comprobante1.comprobante_items) {
                                const k = productos.findIndex(c => c.id == b.articulo)
                                const send = calcularUno({
                                    pu: Number(b.pu),
                                    descuento_tipo: b.descuento_tipo,
                                    descuento_valor: b.descuento_valor,
                                    cantidad: Number(b.cantidad),
                                })

                                descuentos_total += send.descuento

                                if (k === -1) {
                                    productos.push({
                                        id: b.articulo,
                                        nombre: b.producto,
                                        cantidad: Number(b.cantidad),
                                        monto: send.total,
                                        descuento: send.descuento == 0 ? null : send.descuento,
                                    })
                                }
                                else {
                                    productos[k].cantidad += Number(b.cantidad)
                                    productos[k].monto += send.total
                                    productos[k].descuento += send.descuento == 0 ? null : send.descuento
                                }
                            }

                            ///// ----- MÉTODOS DE PAGO ----- /////
                            // console.log(1)
                            const l = venta_pago_metodos.findIndex(b => b.id == a.pago_metodo1.id)
                            if (l === -1) {
                                venta_pago_metodos.push({
                                    id: a.pago_metodo1.id,
                                    nombre: a.pago_metodo1.nombre,
                                    monto: Number(a.monto),
                                    cantidad: 1
                                })
                            }
                            else {
                                venta_pago_metodos[l].monto += Number(a.monto)
                                venta_pago_metodos[l].cantidad++
                            }
                        }
                    }
                }
            }

            send = {
                efectivo_ingresos,
                efectivo_ingresos_total,
                efectivo_ingresos_extra_total,

                efectivo_egresos,
                efectivo_egresos_total,

                ventas_total,
                descuentos_total,

                venta_pago_metodos,
                venta_canales,
                venta_comprobantes,
                comprobantes_aceptados,
                comprobantes_aceptados_total,
                comprobantes_anulados,
                comprobantes_anulados_total,
                productos,
                productos_anulados,
            }
        }

        res.json({ code: 0, data: send })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

function calcularUno(item) {
    if (
        item.descuento_tipo != null &&
        item.descuento_valor != null &&
        item.descuento_valor != 0
    ) {
        if (item.descuento_tipo == 1) {
            item.pu_desc = item.descuento_valor
        } else if (item.descuento_tipo == 2) {
            item.pu_desc = item.pu * (item.descuento_valor / 100)
        }
    } else {
        item.pu_desc = 0
    }

    item.descuento = item.cantidad * item.pu_desc
    item.total = item.cantidad * (item.pu - item.pu_desc)

    return item
}

export default {
    find,
    create,
    // update,
    delet,
    findResumen,
}