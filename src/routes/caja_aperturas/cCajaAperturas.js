import { CajaApertura } from '../../database/models/CajaApertura.js'
import { DineroMovimiento } from '../../database/models/DineroMovimiento.js'
import { PagoMetodo } from '../../database/models/PagoMetodo.js'
import { Comprobante, ComprobanteItem } from '../../database/models/Comprobante.js'
import { Colaborador } from '../../database/models/Colaborador.js'
import { Transaccion } from '../../database/models/Transaccion.js'
import { applyFilters } from '../../utils/mine.js'
import cSistema from "../_sistema/cSistema.js"

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
        const { id } = req.params

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
            productos: [],
            productos_anulados: [],
            ventas_credito_total: 0,
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
                    model: ComprobanteItem,
                    as: 'comprobante_items',
                    attributes: ['id', 'articulo', 'descripcion', 'pu', 'descuento_tipo', 'descuento_valor', 'cantidad'],
                },
                {
                    model: Comprobante,
                    as: 'canjeado_por1',
                    attributes: ['id', 'doc_tipo', 'serie', 'numero', 'serie_correlativo'],
                },
                {
                    model: Transaccion,
                    as: 'transaccion1',
                    attributes: ['venta_canal'],
                }
            ]
        })

        const pago_comprobantesMap = cSistema.arrayMap('pago_comprobantes')
        const venta_canalesMap = cSistema.arrayMap('venta_canales')

        for (const a of comprobantes) {
            const tKey = a.doc_tipo.replace(`${empresa.subdominio}-`, '')
            const tipo_comprobante_nombre = pago_comprobantesMap[tKey].nombre

            // --- ACEPTADOS --- //
            if (['1', '2', '3'].includes(a.estado)) {
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

                // --- CRÉDITO --- //
                if (a.pago_condicion == 2) {
                    send.ventas_credito_total += Number(a.monto)

                    const k = send.venta_pago_metodos.findIndex(b => b.id == 'CRÉDITO')
                    if (k === -1) {
                        send.venta_pago_metodos.push({
                            id: 'CRÉDITO',
                            nombre: 'CRÉDITO',
                            monto: Number(a.monto),
                            cantidad: 1
                        })
                    }
                    else {
                        send.venta_pago_metodos[k].monto += Number(a.monto)
                        send.venta_pago_metodos[k].cantidad++
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

        send.venta_pago_metodos = send.venta_pago_metodos.sort((a, b) => {
            if (a.nombre === 'CRÉDITO' && b.nombre !== 'CRÉDITO') return 1
            if (b.nombre === 'CRÉDITO' && a.nombre !== 'CRÉDITO') return -1
            return a.nombre.localeCompare(b.nombre)
        })
        send.venta_comprobantes = send.venta_comprobantes.sort((a, b) => a.nombre.localeCompare(b.nombre))
        send.productos = send.productos.sort((a, b) => a.nombre.localeCompare(b.nombre))

        res.json({ code: 0, data: send })
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