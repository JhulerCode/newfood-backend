import sequelize from '../../database/sequelize.js'
import { fn, col, Op } from 'sequelize'
import { Comprobante, ComprobanteItem } from '../../database/models/Comprobante.js'
import { Empresa } from '../../database/models/Empresa.js'
import { Socio } from '../../database/models/Socio.js'
import { PagoComprobante } from '../../database/models/PagoComprobante.js'
import { Kardex } from '../../database/models/Kardex.js'
import { Articulo } from '../../database/models/Articulo.js'
import { Transaccion, TransaccionItem } from '../../database/models/Transaccion.js'
import { Colaborador } from '../../database/models/Colaborador.js'
import { DineroMovimiento } from "../../database/models/DineroMovimiento.js"
import cSistema from "../_sistema/cSistema.js"

// import { applyFilters } from '../../utils/mine.js'
// import { Mesa } from '../../database/models/Mesa.js'

const includes1 = {
    socio1: {
        model: Socio,
        as: 'socio1',
        attributes: ['id', 'nombres']
    },
    createdBy1: {
        model: Colaborador,
        as: 'createdBy1',
        attributes: ['id', 'nombres', 'apellidos', 'nombres_apellidos']
    },
}

const create = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador } = req.user
        const {
            fecha, doc_tipo, socio, pago_condicion, estado, monto,
            total_gravada, total_exonerada, total_inafecta, total_igv,
            comprobante_items, transaccion, pago_metodos,
        } = req.body

        const empresa = await Empresa.findByPk('1')
        const cliente = await Socio.findByPk(socio)
        const pago_comprobante = await PagoComprobante.findByPk(doc_tipo)

        // ----- CREAR ----- //
        const nuevo = await Comprobante.create({
            socio,
            pago_condicion,
            monto,
            estado,

            empresa_ruc: empresa.ruc,
            empresa_razon_social: empresa.razon_social,
            empresa_nombre_comercial: empresa.nombre_comercial,
            empresa_domicilio_fiscal: empresa.domicilio_fiscal,
            empresa_ubigeo: empresa.ubigeo,
            empresa_urbanizacion: empresa.urbanizacion,
            empresa_distrito: empresa.distrito,
            empresa_provincia: empresa.provincia,
            empresa_departamento: empresa.departamento,
            empresa_modo: '0', // NO SÉ

            cliente_razon_social_nombres: cliente.nombres,
            cliente_numero_documento: cliente.doc_numero,
            cliente_codigo_tipo_entidad: cliente.doc_tipo,
            cliente_cliente_direccion: cliente.direccion, // QUÉ PASA SI ES DNI

            venta_serie: pago_comprobante.serie,
            venta_numero: pago_comprobante.correlativo,
            venta_fecha_emision: fecha,
            venta_hora_emision: '10:00:00',
            venta_fecha_vencimiento: '',
            venta_moneda_id: '2', // NO SÉ
            venta_forma_pago_id: '1', // NO SÉ
            venta_total_gravada: total_gravada,
            venta_total_igv: total_igv,
            venta_total_exonerada: total_exonerada,
            venta_total_inafecta: total_inafecta,
            venta_tipo_documento_codigo: doc_tipo,
            venta_nota: '', // NO SÉ

            createdBy: colaborador
        }, { transaction })

        // ----- GUARDAR ITEMS ----- //
        const items = comprobante_items.map(a => ({
            articulo: a.articulo,

            producto: a.nombre,
            codigo_unidad: a.unidad,
            cantidad: a.cantidad,
            precio_base: a.vu,
            tipo_igv_codigo: a.igv_afectacion,
            codigo_sunat: '-', // NO SÉ
            codigo_producto: '-',

            comprobante: nuevo.id,
            createdBy: colaborador
        }))

        await ComprobanteItem.bulkCreate(items, { transaction })

        // ----- ACTUALIZAR CORRELATIVO ----- //
        await PagoComprobante.update(
            { correlativo: pago_comprobante.correlativo + 1 },
            {
                where: { id: doc_tipo },
                transaction
            }
        )

        // ----- GUARDAR KARDEX ----- //
        const kardexItems = []

        for (const a of comprobante_items) {
            if (a.is_combo == true) {
                for (const b of a.combo_articulos) {
                    if (b.articulo1.has_receta) {
                        for (const c of b.articulo1.receta_insumos) {
                            kardexItems.push({
                                tipo: 2,
                                fecha,
                                articulo: c.articulo,
                                cantidad: c.cantidad * b.cantidad * a.cantidad,
                                estado: 1,
                                transaccion: transaccion.id,
                                createdBy: colaborador
                            })
                        }
                    } else {
                        kardexItems.push({
                            tipo: 2,
                            fecha,
                            articulo: b.articulo,
                            cantidad: b.cantidad * a.cantidad,
                            estado: 1,
                            transaccion: transaccion.id,
                            createdBy: colaborador
                        })
                    }
                }
            }
            else {
                if (a.has_receta == true) {
                    console.log(a.nombre)
                    for (const b of a.receta_insumos) {
                        kardexItems.push({
                            tipo: 2,
                            fecha,
                            articulo: b.articulo,
                            cantidad: b.cantidad * a.cantidad,
                            estado: 1,
                            transaccion: transaccion.id,
                            createdBy: colaborador
                        })
                    }
                } else {
                    kardexItems.push({
                        tipo: 2,
                        fecha,
                        articulo: a.articulo,
                        cantidad: a.cantidad,
                        estado: 1,
                        transaccion: transaccion.id,
                        createdBy: colaborador
                    })
                }
            }
        }
        await Kardex.bulkCreate(kardexItems, { transaction })

        // ----- ACTUALIZAR STOCK ----- //
        const transaccion_tiposMap = cSistema.arrayMap('kardex_tipos')
        const tipoInfo = transaccion_tiposMap[2]

        for (const a of kardexItems) {
            await Articulo.update(
                {
                    stock: sequelize.literal(`COALESCE(stock, 0) ${tipoInfo.operacion == 1 ? '+' : '-'} ${a.cantidad}`)
                },
                {
                    where: { id: a.articulo },
                    transaction
                }
            )
        }

        ///// ----- ACTUALIZAR PEDIDO ITEMS ----- /////
        for (const a of comprobante_items) {
            await TransaccionItem.update(
                {
                    venta_entregado: a.cantidad
                },
                {
                    where: {
                        articulo: a.articulo,
                        transaccion: transaccion.id
                    },
                    transaction
                }
            )
        }

        ///// ----- GUARDAR PAGOS ----- /////
        if (pago_condicion == 1) {
            const pagoItems = pago_metodos.map(a => ({
                fecha,
                tipo: 1,
                operacion: 1,
                detalle: null,
                pago_metodo: '1',
                monto,
                comprobante: nuevo.id,
                transaccion: transaccion.id,
                caja_apertura: caja_apertura.id,
                createdBy: colaborador
            }))
            await DineroMovimiento.bulkCreate(pagoItems, { transaction })
        }

        await transaction.commit()

        ///// ----- ACTUALIZAR PEDIDO SI ES MESA ----- /////
        if (transaccion.venta_canal == 1) {
            const pedido_items = await TransaccionItem.findAll({
                where: { transaccion: transaccion.id }
            })
            const is_pendiente = pedido_items.some(a => a.venta_entregado < a.cantidad)
            if (is_pendiente == false) {
                await Transaccion.update(
                    { venta_entregado: true },
                    {
                        where: { id: transaccion.id },
                    }
                )
            }
        }

        // ----- DEVOLVER ----- //
        const data = await loadOne(nuevo.id)
        res.json({ code: 0, data })
    }
    catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

async function loadOne(id) {
    let data = await Comprobante.findByPk(id, {
        include: [includes1.socio1, includes1.createdBy1]
    })

    if (data) {
        data = data.toJSON()

        const pago_condicionesMap = cSistema.arrayMap('pago_condiciones')
        const transaccion_estadosMap = cSistema.arrayMap('transaccion_estados')

        data.pago_condicion1 = pago_condicionesMap[data.pago_condicion]
        data.estado1 = transaccion_estadosMap[data.estado]
    }

    return data
}

const find = async (req, res) => {
    try {
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        const findProps = {
            attributes: ['id'],
            order: [['createdAt', 'DESC']],
            where: {},
            include: []
        }

        if (qry) {
            if (qry.incl) {
                for (const a of qry.incl) {
                    if (qry.incl.includes(a)) findProps.include.push(includes1[a])
                }
            }

            if (qry.fltr) {
                Object.assign(findProps.where, applyFilters(qry.fltr))
            }

            if (qry.cols) {
                const excludeCols = [
                    'timeAgo',
                ]
                const cols1 = qry.cols.filter(a => !excludeCols.includes(a))
                findProps.attributes = findProps.attributes.concat(cols1)

                // ----- AGREAGAR LOS REF QUE SI ESTÁN EN LA BD ----- //
                if (qry.cols.includes('socio')) findProps.include.push(includes1.socio1)
            }
        }

        let data = await Comprobante.findAll(findProps)

        if (data.length > 0 && qry.cols) {
            data = data.map(a => a.toJSON())

            const pago_condicionesMap = cSistema.arrayMap('pago_condiciones')
            const transaccion_estadosMap = cSistema.arrayMap('transaccion_estados')

            for (const a of data) {
                if (qry.cols.includes('pago_condicion')) a.pago_condicion1 = pago_condicionesMap[a.pago_condicion]
                if (qry.cols.includes('estado')) a.estado1 = transaccion_estadosMap[a.estado]
            }
        }

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const findById = async (req, res) => {
    try {
        const { id } = req.params

        let data = await Comprobante.findByPk(id, {
            include: [
                {
                    model: ComprobanteItem,
                    as: 'transaccion_items',
                    include: [
                        {
                            model: Articulo,
                            as: 'articulo1',
                            attributes: ['nombre', 'unidad']
                        },
                    ]
                },
                {
                    model: Socio,
                    as: 'socio1',
                    attributes: ['id', 'nombres']
                },
                {
                    model: Mesa,
                    as: 'venta_mesa1',
                    attributes: ['id', 'nombre']
                }
            ]
        })

        if (data) {
            data = data.toJSON()

            for (const a of data.transaccion_items) {
                a.cantidad_anterior = a.cantidad || 0
            }
        }

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const delet = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { id } = req.params
        const { tipo, estado } = req.body

        await Kardex.destroy({
            where: { transaccion: id },
            transaction
        })

        await ComprobanteItem.destroy({
            where: { transaccion: id },
            transaction
        })

        await Comprobante.destroy({
            where: { id },
            transaction
        })

        if (estado != 0) {
            const transaccion_items = await ComprobanteItem.findAll({
                where: { transaccion: id },
                attributes: ['id', 'articulo', 'cantidad'],
            })

            const transaccion_tiposMap = cSistema.arrayMap('kardex_tipos')
            const tipoInfo = transaccion_tiposMap[tipo]

            for (const a of transaccion_items) {
                await Articulo.update(
                    {
                        stock: sequelize.literal(`COALESCE(stock, 0) ${tipoInfo.operacion == 1 ? '-' : '+'} ${a.cantidad}`)
                    },
                    {
                        where: { id: a.articulo },
                        transaction
                    }
                )
            }
        }

        await transaction.commit()

        res.json({ code: 0 })
    }
    catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

export default {
    create,
    find,
    findById,
    delet,
}