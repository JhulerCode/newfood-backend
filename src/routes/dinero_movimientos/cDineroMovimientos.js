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
                const excludeCols = []
                const cols1 = qry.cols.filter(a => !excludeCols.includes(a))
                findProps.attributes = findProps.attributes.concat(cols1)
            }
        }

        let data = await DineroMovimiento.findAll(findProps)

        if (data.length > 0) {
            data = data.map(a => a.toJSON())

            const caja_operacion_tiposMap = cSistema.arrayMap('caja_operacion_tipos')
            const caja_operacionesMap = cSistema.arrayMap('caja_operaciones')
            const dinero_movimiento_estadosMap = cSistema.arrayMap('dinero_movimiento_estados')

            for (const a of data) {
                if (qry.cols.includes('tipo')) a.tipo1 = caja_operacion_tiposMap[a.tipo]
                if (qry.cols.includes('operacion')) a.operacion1 = caja_operacionesMap[a.operacion]
                if (qry.cols.includes('estado')) a.estado1 = dinero_movimiento_estadosMap[a.estado]
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

       // --- CREAR --- //
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
        const dinero_movimiento_estadosMap = cSistema.arrayMap('dinero_movimiento_estados')

        data.tipo1 = caja_operacion_tiposMap[data.tipo]
        data.operacion1 = caja_operacionesMap[data.operacion]
        data.estado1 = dinero_movimiento_estadosMap[data.estado]
    }

    return data
}

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

        const send = {
            efectivo_ingresos: [],
            efectivo_ingresos_total: 0,
            efectivo_ingresos_extra_total: 0,

            efectivo_egresos: [],
            efectivo_egresos_total: 0,

            ventas_total: 0,
            descuentos_total: 0,

            venta_pago_metodos: [],
            venta_canales: [],
            venta_comprobantes: [],
            comprobantes_aceptados: [],
            comprobantes_aceptados_total: 0,
            comprobantes_anulados: [],
            comprobantes_anulados_total: 0,
            productos: [],
            productos_anulados: [],
        }

        if (data.length > 0) {
            data = data.map(a => a.toJSON())

            const venta_canalesMap = cSistema.arrayMap('venta_canales')
            const caja_operacionesMap = cSistema.arrayMap('caja_operaciones')
            const pago_comprobantesMap = cSistema.arrayMap('pago_comprobantes')

            for (const a of data) {
                if (a.tipo == 2) {
                    if (a.pago_metodo == 1) {
                        send.efectivo_egresos_total += Number(a.monto)

                        send.efectivo_egresos.push({
                            id: a.id,
                            operacion: caja_operacionesMap[a.operacion].nombre,
                            detalle: a.detalle,
                            monto: Number(a.monto),
                        })
                    }
                }

                if (a.tipo == 1) {
                    if (a.pago_metodo == 1) {
                        send.efectivo_ingresos_total += Number(a.monto)

                        if (a.operacion != 1) {
                            send.efectivo_ingresos_extra_total += Number(a.monto)

                            send.efectivo_ingresos.push({
                                id: a.id,
                                operacion: caja_operacionesMap[a.operacion].nombre,
                                detalle: a.detalle,
                                monto: Number(a.monto),
                            })
                        }
                    }

                    if (a.transaccion1) {
                        send.ventas_total += Number(a.monto)

                        const j = send.venta_canales.findIndex(b => b.id == a.transaccion1.venta_canal)
                        if (j === -1) {
                            send.venta_canales.push({
                                id: a.transaccion1.venta_canal,
                                nombre: venta_canalesMap[a.transaccion1.venta_canal].nombre,
                                monto: Number(a.monto),
                                cantidad: 1
                            })
                        }
                        else {
                            send.venta_canales[j].monto += Number(a.monto)
                            send.venta_canales[j].cantidad++
                        }
                    }

                    if (a.comprobante1) {
                        // --- ANULADOS --- //
                        if (a.comprobante1.estado == 0) {
                            // --- COMPROBANTES --- //
                            send.comprobantes_anulados_total += Number(a.monto)

                            const j = send.comprobantes_anulados.findIndex(b => b.id == a.comprobante1.serie_correlativo)
                            if (j === -1) {
                                send.comprobantes_anulados.push({
                                    id: a.comprobante1.serie_correlativo,
                                    tipo: pago_comprobantesMap[a.comprobante1.venta_tipo_documento_codigo].nombre,
                                    monto: Number(a.monto),
                                })
                            }
                            else {
                                send.comprobantes_anulados[i].monto += Number(a.monto)
                            }

                            // --- PRODUCTOS --- //
                            for (const b of a.comprobante1.comprobante_items) {
                                const k = send.productos_anulados.findIndex(c => c.id == b.articulo)
                                const prd = calcularUno({
                                    pu: Number(b.pu),
                                    descuento_tipo: b.descuento_tipo,
                                    descuento_valor: b.descuento_valor,
                                    cantidad: Number(b.cantidad),
                                })

                                if (k === -1) {
                                    send.productos_anulados.push({
                                        id: b.articulo,
                                        nombre: b.producto,
                                        cantidad: Number(b.cantidad),
                                        monto: Number(a.monto),
                                        descuento: prd.descuento == 0 ? null : prd.descuento,
                                    })
                                }
                                else {
                                    send.productos_anulados[k].cantidad += Number(b.cantidad)
                                    send.productos_anulados[k].monto += Number(a.monto)
                                    send.productos_anulados[k].descuento += prd.descuento == 0 ? null : prd.descuento
                                }
                            }
                        }

                        // --- ACEPTADOS --- //
                        if (a.comprobante1.estado == 1) {
                            // --- TIPOS DE COMPROBANTES --- //
                            const i = send.venta_comprobantes.findIndex(b => b.id == a.comprobante1.venta_tipo_documento_codigo)
                            if (i === -1) {
                                send.venta_comprobantes.push({
                                    id: a.comprobante1.venta_tipo_documento_codigo,
                                    nombre: pago_comprobantesMap[a.comprobante1.venta_tipo_documento_codigo].nombre,
                                    monto: Number(a.monto),
                                    cantidad: 1
                                })
                            }
                            else {
                                send.venta_comprobantes[i].monto += Number(a.monto)
                                send.venta_comprobantes[i].cantidad++
                            }

                            // --- COMPROBANTES --- //
                            send.comprobantes_aceptados_total += Number(a.monto)

                            const j = send.comprobantes_aceptados.findIndex(b => b.id == a.comprobante1.serie_correlativo)
                            if (j === -1) {
                                send.comprobantes_aceptados.push({
                                    id: a.comprobante1.serie_correlativo,
                                    tipo: pago_comprobantesMap[a.comprobante1.venta_tipo_documento_codigo].nombre,
                                    monto: Number(a.monto),
                                })
                            }
                            else {
                                send.comprobantes_aceptados[i].monto += Number(a.monto)
                            }

                            // --- PRODUCTOS --- //
                            for (const b of a.comprobante1.comprobante_items) {
                                const k = send.productos.findIndex(c => c.id == b.articulo)
                                const prd = calcularUno({
                                    pu: Number(b.pu),
                                    descuento_tipo: b.descuento_tipo,
                                    descuento_valor: b.descuento_valor,
                                    cantidad: Number(b.cantidad),
                                })

                                send.descuentos_total += prd.descuento

                                if (k === -1) {
                                    send.productos.push({
                                        id: b.articulo,
                                        nombre: b.producto,
                                        cantidad: Number(b.cantidad),
                                        monto: Number(a.monto),
                                        descuento: prd.descuento == 0 ? null : prd.descuento,
                                    })
                                }
                                else {
                                    send.productos[k].cantidad += Number(b.cantidad)
                                    send.productos[k].monto += Number(a.monto)
                                    send.productos[k].descuento += prd.descuento == 0 ? null : prd.descuento
                                }
                            }

                            // --- MÉTODOS DE PAGO --- //
                            const l = send.venta_pago_metodos.findIndex(b => b.id == a.pago_metodo1.id)
                            if (l === -1) {
                                send.venta_pago_metodos.push({
                                    id: a.pago_metodo1.id,
                                    nombre: a.pago_metodo1.nombre,
                                    monto: Number(a.monto),
                                    cantidad: 1
                                })
                            }
                            else {
                                send.venta_pago_metodos[l].monto += Number(a.monto)
                                send.venta_pago_metodos[l].cantidad++
                            }
                        }
                    }
                }
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
    delet,
    findResumen,
}