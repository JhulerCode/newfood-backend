import { CajaApertura } from '../../database/models/CajaApertura.js'
import { DineroMovimiento } from '../../database/models/DineroMovimiento.js'
import { PagoMetodo } from '../../database/models/PagoMetodo.js'
import { Comprobante, ComprobanteItem } from '../../database/models/Comprobante.js'
import { Colaborador } from '../../database/models/Colaborador.js'
import { Transaccion } from '../../database/models/Transaccion.js'
import { applyFilters } from '../../utils/mine.js'
import cSistema from "../_sistema/cSistema.js"
import dayjs from 'dayjs'
import { Op, fn, col } from 'sequelize'

const create = async (req, res) => {
    try {
        const { colaborador, empresa } = req.user
        const { fecha_apertura, fecha_cierre, monto_apertura, monto_cierre } = req.body

        // --- CREAR --- //
        const nuevo = await CajaApertura.create({
            fecha_apertura, monto_apertura,
            estado: 1,
            empresa: empresa.id,
            createdBy: colaborador
        })

        const data = await loadOne(nuevo.id)

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const cerrar = async (req, res) => {
    try {
        const { colaborador, empresa } = req.user
        const { id } = req.params
        const { fecha_apertura, fecha_cierre, monto_apertura, monto_cierre } = req.body

        const pedidos = await Transaccion.findAll({
            where: { tipo: 2, estado: '1', empresa: empresa.id }
        })

        if (pedidos.length > 0) {
            return res.json({ code: 1, msg: 'No se puede cerrar caja con pedidos pendientes' })
        }

        // --- ACTUALIZAR --- //
        const [affectedRows] = await CajaApertura.update(
            {
                fecha_cierre, monto_cierre,
                estado: 2,
                updatedBy: colaborador
            },
            { where: { id } }
        )

        if (affectedRows > 0) {
            const data = await loadOne(id)
            res.json({ code: 0, data })
        }
        else {
            res.json({ code: 1, msg: 'No se actualizó ningún registro' })
        }
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        const findProps = {
            attributes: ['id'],
            order: [['createdAt', 'DESC']],
            where: { empresa: empresa.id },
            include: [],
        }

        const include1 = {
            createdBy1: {
                model: Colaborador,
                as: 'createdBy1',
                attributes: ['id', 'nombres', 'apellidos', 'nombres_apellidos'],
            },
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

        let data = await CajaApertura.findAll(findProps)

        if (data.length > 0 && qry.cols) {
            data = data.map(a => a.toJSON())

            const caja_apertura_estadosMap = cSistema.arrayMap('caja_apertura_estados')

            for (const a of data) {
                if (qry.cols.includes('estado')) a.estado1 = caja_apertura_estadosMap[a.estado]
            }
        }

        res.json({ code: 0, data })
    }
    catch (error) {
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
        const dinero_movimientos = await DineroMovimiento.findAll({
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
                    model: Comprobante,
                    as: 'comprobante1',
                    attributes: ['id', 'doc_tipo', 'serie', 'numero', 'serie_correlativo', 'caja_apertura']
                }
            ]
        })

        const caja_operacionesMap = cSistema.arrayMap('caja_operaciones')

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
                        if (a.pago_metodo == `${empresa.subdominio}-EFECTIVO`) {
                            send.efectivo_ingresos_total += Number(a.monto)
                        }

                        // --- MÉTODOS DE PAGO --- //
                        const i = send.venta_pago_metodos.findIndex(b => b.id == a.pago_metodo1.id)
                        if (i === -1) {
                            send.venta_pago_metodos.push({
                                id: a.pago_metodo1.id,
                                nombre: a.pago_metodo1.nombre,
                                monto: Number(a.monto),
                                cantidad: 1
                            })
                        }
                        else {
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
        const comprobantes = await Comprobante.findAll({
            attributes: ['id', 'doc_tipo', 'serie', 'numero', 'serie_correlativo', 'monto', 'pago_condicion', 'estado'],
            order: [['createdAt', 'DESC']],
            where: {
                caja_apertura: id,
            },
            include: [
                {
                    model: Comprobante,
                    as: 'canjeado_por1',
                    attributes: ['id', 'doc_tipo', 'serie', 'numero', 'serie_correlativo'],
                },
                {
                    model: ComprobanteItem,
                    as: 'comprobante_items',
                    attributes: ['id', 'articulo', 'descripcion', 'pu', 'descuento_tipo', 'descuento_valor', 'cantidad'],
                },
                {
                    model: Transaccion,
                    as: 'transaccion1',
                    attributes: ['venta_canal'],
                },
                {
                    model: DineroMovimiento,
                    as: 'dinero_movimientos',
                    attributes: ['id', 'pago_metodo', 'monto', 'caja_apertura'],
                    include: {
                        model: PagoMetodo,
                        as: 'pago_metodo1',
                        attributes: ['id', 'nombre', 'color']
                    }
                }
            ]
        })

        const pago_comprobantesMap = cSistema.arrayMap('pago_comprobantes')
        const venta_canalesMap = cSistema.arrayMap('venta_canales')

        for (const a of comprobantes) {
            // let tKey = a.doc_tipo.replace(`${empresa.subdominio}-`, '')

            // ---- ALERTA VERIFICAR BIEN EL TIPO DE COMPROBANTE ---- //
            let tKey = ''
            if (a.doc_tipo.includes('01')) {
                tKey = '01'
            } else if (a.doc_tipo.includes('03')) {
                tKey = '03'
            } else if (a.doc_tipo.includes('NV')) {
                tKey = 'NV'
            }

            const tipo_comprobante_nombre = pago_comprobantesMap[tKey].nombre
            
            // --- ACEPTADOS --- //
            if (['1', '2', '3'].includes(a.estado)) {
                // --- MÉTODOS DE PAGO --- //
                let comprobante_pagos_total = 0
                for (const b of a.dinero_movimientos) {
                    if (b.caja_apertura == id) {
                        comprobante_pagos_total += Number(b.monto)

                        // const i = send.venta_pago_metodos.findIndex(c => c.id == b.pago_metodo1.id)
                        // if (i === -1) {
                        //     send.venta_pago_metodos.push({
                        //         id: b.pago_metodo1.id,
                        //         nombre: b.pago_metodo1.nombre,
                        //         monto: Number(b.monto),
                        //         cantidad: 1
                        //     })
                        // }
                        // else {
                        //     send.venta_pago_metodos[i].monto += Number(b.monto)
                        //     send.venta_pago_metodos[i].cantidad++
                        // }
                    }
                }

                // --- CRÉDITO --- //
                if (a.monto > comprobante_pagos_total) {
                    const k = send.venta_pago_metodos.findIndex(b => b.id == 'CRÉDITO')
                    if (k === -1) {
                        send.venta_pago_metodos.push({
                            id: 'CRÉDITO',
                            nombre: 'CRÉDITO',
                            monto: Number(a.monto) - comprobante_pagos_total,
                            cantidad: 1
                        })
                    }
                    else {
                        send.venta_pago_metodos[k].monto += Number(a.monto) - comprobante_pagos_total
                        send.venta_pago_metodos[k].cantidad++
                    }
                }

                // --- TIPOS DE COMPROBANTES --- //
                const i = send.venta_comprobantes.findIndex(b => b.id == a.doc_tipo)
                if (i === -1) {
                    send.venta_comprobantes.push({
                        id: a.doc_tipo,
                        nombre: tipo_comprobante_nombre,
                        monto: Number(a.monto),
                        cantidad: 1
                    })
                }
                else {
                    send.venta_comprobantes[i].monto += Number(a.monto)
                    send.venta_comprobantes[i].cantidad++
                }

                // --- CANALES --- //
                const j = send.venta_canales.findIndex(b => b.id == a.transaccion1.venta_canal)
                if (j === -1) {
                    send.venta_canales.push({
                        id: a.transaccion1.venta_canal,
                        name: venta_canalesMap[a.transaccion1.venta_canal].nombre,
                        value: Number(a.monto),
                        cantidad: 0,
                    })
                }
                else {
                    send.venta_canales[j].value += Number(a.monto)
                }

                // --- COMPROBANTES --- //
                send.comprobantes_aceptados_total += Number(a.monto)

                send.comprobantes_aceptados.push({
                    id: a.serie_correlativo,
                    tipo: tipo_comprobante_nombre,
                    monto: Number(a.monto),
                    pago_condicion: a.pago_condicion,
                })

                // --- PRODUCTOS --- //
                for (const b of a.comprobante_items) {
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
                            nombre: b.descripcion,
                            cantidad: Number(b.cantidad),
                            monto: Number(prd.total),
                            descuento: prd.descuento == 0 ? null : prd.descuento,
                        })
                    }
                    else {
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
                    id: a.serie_correlativo,
                    tipo: tipo_comprobante_nombre,
                    monto: Number(a.monto),
                })

                // --- PRODUCTOS --- //
                for (const b of a.comprobante_items) {
                    const k = send.productos_anulados.findIndex(c => c.id == b.articulo)
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
                    }
                    else {
                        send.productos_anulados[k].cantidad += Number(b.cantidad)
                        send.productos_anulados[k].monto += Number(prd.total)
                        send.productos_anulados[k].descuento += prd.descuento == 0 ? null : prd.descuento
                    }
                }
            }

            // --- CANJEADOS --- //
            if (a.estado == 4) {
                // --- COMPROBANTES --- //
                send.comprobantes_canjeados.push({
                    id: a.serie_correlativo,
                    tipo: tipo_comprobante_nombre,
                    monto: Number(a.monto),
                    canjeado_por: a.canjeado_por1.serie_correlativo
                })
            }
        }

        // --- Transacciones --- //
        let pedidos = await Transaccion.findAll({
            attributes: ['id', 'venta_codigo', 'venta_canal', 'monto', 'estado'],
            order: [['createdAt', 'DESC']],
            where: {
                tipo: 2,
                caja_apertura: id,
            },
        })

        for (let a of pedidos) {
            if (['1', '2'].includes(a.estado)) {
                const i = send.venta_canales.findIndex(b => b.id == a.venta_canal)
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
        send.venta_comprobantes = send.venta_comprobantes.sort((a, b) => a.nombre.localeCompare(b.nombre))
        send.productos = send.productos.sort((a, b) => a.nombre.localeCompare(b.nombre))

        if (is_past != 'true') {
            // --- Ventas del mes --- //
            const hoy = dayjs(fecha_apertura)
            const mesInicio = hoy.startOf("month").format('YYYY-MM-DD')
            const mesFin = hoy.endOf("month").format('YYYY-MM-DD')

            const caja_aperturas = await CajaApertura.findAll({
                attributes: ['id', 'fecha_apertura'],
                order: [['createdAt', 'DESC']],
                where: {
                    empresa: empresa.id,
                    fecha_apertura: {
                        [Op.between]: [mesInicio, mesFin],
                    }
                }
            })

            send.ventas_mes = await DineroMovimiento.findOne({
                attributes: [[fn("SUM", col("monto")), "total"]],
                where: {
                    caja_apertura: caja_aperturas.map(a => a.id),
                    estado: '2',
                    operacion: '1',
                },
                // raw: true,
            })

            // --- Ventas ayer --- //
            const caja_aperturas_ayer = await CajaApertura.findAll({
                attributes: ['id', 'fecha_apertura'],
                order: [['createdAt', 'DESC']],
                where: {
                    empresa: empresa.id,
                },
                limit: 2
            })

            if (caja_aperturas_ayer.length > 1) {
                send.ventas_ayer = await DineroMovimiento.findOne({
                    attributes: [[fn("SUM", col("monto")), "total"]],
                    where: {
                        caja_apertura: caja_aperturas_ayer[1].id,
                        estado: '2',
                        operacion: '1',
                    },
                    // raw: true,
                })
            }
        }

        res.json({
            code: 0,
            data: send,
            // caja_aperturas,
        })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}


// --- Funciones --- //
async function loadOne(id) {
    let data = await CajaApertura.findByPk(id, {
        include: [
            {
                model: Colaborador,
                as: 'createdBy1',
                attributes: ['id', 'nombres', 'apellidos', 'nombres_apellidos'],
            },
        ],
    })

    if (data) {
        data = data.toJSON()

        const estadosMap = cSistema.arrayMap('transaccion_estados')

        data.estado1 = estadosMap[data.estado]
    }

    return data
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
            item.pu_desc = item.cantidad * item.pu * (item.descuento_valor / 100)
        }
    } else {
        item.pu_desc = 0
    }

    item.descuento = item.pu_desc
    item.total = (item.cantidad * item.pu) - item.descuento

    return item
}

export default {
    create,
    cerrar,
    find,
    findResumen,
}