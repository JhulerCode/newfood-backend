import { CajaApertura } from '#db/models/CajaApertura.js'
import { Op, fn, col } from 'sequelize'
import {
    CajaAperturaRepository,
    TransaccionRepository,
    DineroMovimientoRepository,
    ComprobanteRepository,
} from '#db/repositories.js'
import { arrayMap } from '#store/system.js'
import { resUpdateFalse } from '#http/helpers.js'
import dayjs from 'dayjs'

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        qry.fltr.empresa = { op: 'Es', val: empresa }

        const data = await CajaAperturaRepository.find(qry, true)

        if (data.length > 0) {
            const caja_apertura_estadosMap = arrayMap('caja_apertura_estados')

            for (const a of data) {
                if (qry?.cols?.includes('estado')) a.estado1 = caja_apertura_estadosMap[a.estado]
            }
        }

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const create = async (req, res) => {
    try {
        const { colaborador, empresa } = req.user
        const { fecha_apertura, fecha_cierre, monto_apertura, monto_cierre } = req.body

        // --- CREAR --- //
        const nuevo = await CajaAperturaRepository.create({
            fecha_apertura,
            monto_apertura,
            estado: 1,

            sucursal: req.sucursal.id,
            empresa,
            createdBy: colaborador,
        })

        const data = await loadOne(nuevo.id)

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const cerrar = async (req, res) => {
    try {
        const { colaborador, empresa } = req.user
        const { id } = req.params
        const { fecha_apertura, fecha_cierre, monto_apertura, monto_cierre } = req.body

        const qry = {
            fltr: {
                tipo: { op: 'Es', val: 2 },
                estado: { op: 'Es', val: '1' },
                empresa: { op: 'Es', val: empresa },
            },
        }
        const pedidos = await TransaccionRepository.find(qry)

        if (pedidos.length > 0) {
            return res.json({ code: 1, msg: 'No se puede cerrar caja con pedidos pendientes' })
        }

        // --- ACTUALIZAR --- //
        const updated = await CajaAperturaRepository.update(
            { id },
            {
                fecha_cierre,
                monto_cierre,
                estado: 2,
                updatedBy: colaborador,
            },
        )

        if (updated == false) return resUpdateFalse(res)

        const data = await loadOne(id)

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const findResumen = async (req, res) => {
    try {
        const { empresa } = req.user
        const { id, is_past, fecha_apertura } = req.params

        const send = {
            efectivo_ingresos: [],
            efectivo_ingresos_total: 0,
            efectivo_ingresos_extra_total: 0,

            efectivo_egresos: [],
            efectivo_egresos_total: 0,

            descuentos_total: 0,
            descuentos_anulados_total: 0,

            venta_canales: [],

            pedidos_aceptados: [],
            pedidos_aceptados_total: 0,
            pedidos_anulados: [],
            pedidos_anulados_total: 0,

            venta_pago_metodos: [],
            venta_comprobantes: [],
            comprobantes_aceptados: [],
            comprobantes_aceptados_total: 0,
            comprobantes_anulados: [],
            comprobantes_anulados_total: 0,
            comprobantes_canjeados: [],
            comprobantes_pasados_cobrados: [],
            productos: [],
            productos_anulados: [],

            ventas_ayer: 0,
            ventas_mes: 0,
        }

        // --- Dinero movimientos --- //
        const qry = {
            cols: { exclude: [] },
            fltr: {
                caja_apertura: { op: 'Es', val: id },
            },
            incl: ['pago_metodo1', 'comprobante1'],
            iccl: {
                comprobante1: {
                    cols: ['caja_apertura'],
                },
            },
        }
        const dinero_movimientos = await DineroMovimientoRepository.find(qry, true)

        const caja_operacionesMap = arrayMap('caja_operaciones')

        for (const a of dinero_movimientos) {
            if (a.estado == 2) {
                if (a.tipo == 1) {
                    if (a.operacion != 1) {
                        send.efectivo_ingresos_extra_total += Number(a.monto)

                        send.efectivo_ingresos.push({
                            id: a.id,
                            operacion: caja_operacionesMap[a.operacion].nombre,
                            detalle: a.detalle,
                            monto: Number(a.monto),
                        })
                    }

                    if (a.operacion == 1) {
                        if (a.pago_metodo == `${req.empresa.subdominio}-EFECTIVO`) {
                            send.efectivo_ingresos_total += Number(a.monto)
                        }

                        // --- MÉTODOS DE PAGO --- //
                        const i = send.venta_pago_metodos.findIndex(
                            (b) => b.id == a.pago_metodo1.id,
                        )
                        if (i === -1) {
                            send.venta_pago_metodos.push({
                                id: a.pago_metodo1.id,
                                nombre: a.pago_metodo1.nombre,
                                monto: Number(a.monto),
                                cantidad: 1,
                            })
                        } else {
                            send.venta_pago_metodos[i].monto += Number(a.monto)
                            send.venta_pago_metodos[i].cantidad++
                        }

                        // --- COMPROBANTES PASADOS COBRADOS --- //
                        if (a.comprobante1.caja_apertura != id) {
                            send.comprobantes_pasados_cobrados.push({
                                serie_correlativo: a.comprobante1.serie_correlativo,
                                doc_tipo: a.comprobante1.doc_tipo,
                                monto: Number(a.monto),
                            })
                        }
                    }
                }

                if (a.tipo == 2) {
                    send.efectivo_egresos_total += Number(a.monto)

                    send.efectivo_egresos.push({
                        id: a.id,
                        operacion: caja_operacionesMap[a.operacion].nombre,
                        detalle: a.detalle,
                        monto: Number(a.monto),
                    })
                }
            }
        }

        send.efectivo_ingresos_total += send.efectivo_ingresos_extra_total

        // --- Comprobantes --- //
        const qry1 = {
            cols: [
                'id',
                'doc_tipo',
                'serie',
                'numero',
                'serie_correlativo',
                'monto',
                'pago_condicion',
                'estado',
            ],
            fltr: {
                caja_apertura: { op: 'Es', val: id },
            },
            incl: [
                'doc_tipo1',
                'canjeado_por1',
                'comprobante_items',
                'transaccion1',
                'dinero_movimientos',
            ],
            iccl: {
                transaccion1: {
                    cols: ['venta_canal'],
                },
                dinero_movimientos: {
                    incl: ['pago_metodo1'],
                },
            },
        }
        const comprobantes = await ComprobanteRepository.find(qry1, true)

        const comprobante_tiposMap = arrayMap('comprobante_tipos')
        const venta_canalesMap = arrayMap('venta_canales')

        for (const a of comprobantes) {
            const tipo_comprobante_nombre = a.doc_tipo1.tipo1.nombre

            // --- ACEPTADOS --- //
            if (['1', '2', '3'].includes(a.estado)) {
                // --- MÉTODOS DE PAGO --- //
                let comprobante_pagos_total = 0
                for (const b of a.dinero_movimientos) {
                    if (b.caja_apertura == id) {
                        comprobante_pagos_total += Number(b.monto)
                    }
                }

                // --- CRÉDITO --- //
                if (a.monto > comprobante_pagos_total) {
                    const k = send.venta_pago_metodos.findIndex((b) => b.id == 'CRÉDITO')
                    if (k === -1) {
                        send.venta_pago_metodos.push({
                            id: 'CRÉDITO',
                            nombre: 'CRÉDITO',
                            monto: Number(a.monto) - comprobante_pagos_total,
                            cantidad: 1,
                        })
                    } else {
                        send.venta_pago_metodos[k].monto +=
                            Number(a.monto) - comprobante_pagos_total
                        send.venta_pago_metodos[k].cantidad++
                    }
                }

                // --- TIPOS DE COMPROBANTES --- //
                const i = send.venta_comprobantes.findIndex((b) => b.id == a.doc_tipo1.tipo)
                if (i === -1) {
                    send.venta_comprobantes.push({
                        id: a.doc_tipo1.tipo,
                        nombre: a.doc_tipo1.tipo1.nombre,
                        monto: Number(a.monto),
                        cantidad: 1,
                    })
                } else {
                    send.venta_comprobantes[i].monto += Number(a.monto)
                    send.venta_comprobantes[i].cantidad++
                }

                // --- CANALES --- //
                const j = send.venta_canales.findIndex((b) => b.id == a.transaccion1.venta_canal)
                if (j === -1) {
                    send.venta_canales.push({
                        id: a.transaccion1.venta_canal,
                        name: venta_canalesMap[a.transaccion1.venta_canal].nombre,
                        value: Number(a.monto),
                        cantidad: 0,
                    })
                } else {
                    send.venta_canales[j].value += Number(a.monto)
                }

                // --- COMPROBANTES --- //
                send.comprobantes_aceptados_total += Number(a.monto)

                send.comprobantes_aceptados.push({
                    id: a.doc_tipo,
                    serie_correlativo: a.serie_correlativo,
                    tipo: a.doc_tipo1.tipo1.nombre,
                    monto: Number(a.monto),
                    pago_condicion: a.pago_condicion,
                })

                // --- PRODUCTOS --- //
                for (const b of a.comprobante_items) {
                    const k = send.productos.findIndex((c) => c.id == b.articulo)
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
                            nombre: b.descripcion,
                            cantidad: Number(b.cantidad),
                            monto: Number(prd.total),
                            descuento: prd.descuento == 0 ? null : prd.descuento,
                        })
                    } else {
                        send.productos[k].cantidad += Number(b.cantidad)
                        send.productos[k].monto += Number(prd.total)
                        send.productos[k].descuento += prd.descuento == 0 ? null : prd.descuento
                    }
                }
            }

            // --- ANULADOS --- //
            if (a.estado == 0) {
                // --- COMPROBANTES --- //
                send.comprobantes_anulados_total += Number(a.monto)

                send.comprobantes_anulados.push({
                    id: a.doc_tipo,
                    serie_correlativo: a.serie_correlativo,
                    tipo: a.doc_tipo1.tipo1.nombre,
                    monto: Number(a.monto),
                })

                // --- PRODUCTOS --- //
                for (const b of a.comprobante_items) {
                    const k = send.productos_anulados.findIndex((c) => c.id == b.articulo)
                    const prd = calcularUno({
                        pu: Number(b.pu),
                        descuento_tipo: b.descuento_tipo,
                        descuento_valor: b.descuento_valor,
                        cantidad: Number(b.cantidad),
                    })

                    send.descuentos_anulados_total += prd.descuento

                    if (k === -1) {
                        send.productos_anulados.push({
                            id: b.articulo,
                            nombre: b.descripcion,
                            cantidad: Number(b.cantidad),
                            monto: Number(prd.total),
                            descuento: prd.descuento == 0 ? null : prd.descuento,
                        })
                    } else {
                        send.productos_anulados[k].cantidad += Number(b.cantidad)
                        send.productos_anulados[k].monto += Number(prd.total)
                        send.productos_anulados[k].descuento +=
                            prd.descuento == 0 ? null : prd.descuento
                    }
                }
            }

            // --- CANJEADOS --- //
            if (a.estado == 4) {
                // --- COMPROBANTES --- //
                send.comprobantes_canjeados.push({
                    id: a.doc_tipo,
                    serie_correlativo: a.serie_correlativo,
                    tipo: a.doc_tipo1.tipo1.nombre,
                    monto: Number(a.monto),
                    canjeado_por: a.canjeado_por1.serie_correlativo,
                })
            }
        }

        // --- Transacciones --- //
        const qry2 = {
            cols: ['id', 'venta_codigo', 'venta_canal', 'monto', 'estado'],
            fltr: {
                tipo: { op: 'Es', val: 2 },
                caja_apertura: { op: 'Es', val: id },
            },
        }
        let pedidos = await TransaccionRepository.find(qry2, true)

        for (let a of pedidos) {
            if (['1', '2'].includes(a.estado)) {
                const i = send.venta_canales.findIndex((b) => b.id == a.venta_canal)
                if (i !== -1) {
                    send.venta_canales[i].cantidad++
                }

                send.pedidos_aceptados_total += Number(a.monto)

                send.pedidos_aceptados.push({
                    id: a.venta_canal,
                    venta_codigo: a.venta_codigo,
                    venta_canal: venta_canalesMap[a.venta_canal].nombre,
                    monto: Number(a.monto),
                })
            }

            if (a.estado == 0) {
                send.pedidos_anulados_total += Number(a.monto)

                send.pedidos_anulados.push({
                    id: a.id,
                    venta_codigo: a.venta_codigo,
                    venta_canal: venta_canalesMap[a.venta_canal].nombre,
                    monto: a.monto,
                })
            }
        }

        // --- Ordenar crédito al final --- //
        send.venta_pago_metodos = send.venta_pago_metodos.sort((a, b) => {
            if (a.nombre === 'CRÉDITO' && b.nombre !== 'CRÉDITO') return 1
            if (b.nombre === 'CRÉDITO' && a.nombre !== 'CRÉDITO') return -1
            return a.nombre.localeCompare(b.nombre)
        })
        send.venta_comprobantes = send.venta_comprobantes.sort((a, b) =>
            a.nombre.localeCompare(b.nombre),
        )
        send.productos = send.productos.sort((a, b) => a.nombre.localeCompare(b.nombre))

        if (is_past != 'true') {
            // --- Ventas del mes --- //
            const hoy = dayjs(fecha_apertura)
            const mesInicio = hoy.startOf('month').format('YYYY-MM-DD')
            const mesFin = hoy.endOf('month').format('YYYY-MM-DD')

            const qry3 = {
                cols: ['id', 'fecha_apertura'],
                fltr: {
                    empresa: { op: 'Es', val: empresa },
                    fecha_apertura: { op: 'Está dentro de', val: mesInicio, val1: mesFin },
                },
            }
            const caja_aperturas = await CajaAperturaRepository.find(qry3, true)

            const qry4 = {
                cols: [[fn('SUM', col('monto')), 'total']],
                fltr: {
                    caja_apertura: { op: 'Es', val: caja_aperturas.map((a) => a.id) },
                    estado: { op: 'Es', val: '2' },
                    operacion: { op: 'Es', val: '1' },
                },
            }
            send.ventas_mes = await DineroMovimientoRepository.find(qry4, true)

            // --- Ventas ayer --- //
            const qry5 = {}
            const caja_aperturas_ayer = await CajaApertura.findAll({
                attributes: ['id', 'fecha_apertura'],
                order: [['createdAt', 'DESC']],
                where: {
                    empresa,
                },
                limit: 2,
            })

            if (caja_aperturas_ayer.length > 1) {
                const qry6 = {
                    cols: [[fn('SUM', col('monto')), 'total']],
                    fltr: {
                        caja_apertura: { op: 'Es', val: caja_aperturas_ayer[1].id },
                        estado: { op: 'Es', val: '2' },
                        operacion: { op: 'Es', val: '1' },
                    },
                }
                const asd = await DineroMovimientoRepository.find(qry6, true)
                send.ventas_ayer = asd[0]
                //     attributes: [[fn('SUM', col('monto')), 'total']],
                //     where: {
                //         caja_apertura: caja_aperturas_ayer[1].id,
                //         estado: '2',
                //         operacion: '1',
                //     },
                // })
            }
        }

        res.json({
            code: 0,
            data: send,
        })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

// --- Funciones --- //
async function loadOne(id) {
    const data = await CajaAperturaRepository.find({ id, incl: ['createdBy1'] }, true)

    if (data) {
        const estadosMap = arrayMap('transaccion_estados')

        data.estado1 = estadosMap[data.estado]
    }

    return data
}

function calcularUno(item) {
    if (item.descuento_tipo != null && item.descuento_valor != null && item.descuento_valor != 0) {
        if (item.descuento_tipo == 1) {
            item.pu_desc = item.descuento_valor
        } else if (item.descuento_tipo == 2) {
            item.pu_desc = item.cantidad * item.pu * (item.descuento_valor / 100)
        }
    } else {
        item.pu_desc = 0
    }

    item.descuento = item.pu_desc
    item.total = item.cantidad * item.pu - item.descuento

    return item
}

function setTipoComprobanteKey(doc_tipo) {
    let key = 'NV'
    if (doc_tipo.includes('01')) {
        key = '01'
    } else if (doc_tipo.includes('03')) {
        key = '03'
    }

    // const comprobante_tipos = arrayMap('comprobante_tipos')
    // return comprobante_tipos[key]
    return key
}

export default {
    create,
    cerrar,
    find,
    findResumen,
}
