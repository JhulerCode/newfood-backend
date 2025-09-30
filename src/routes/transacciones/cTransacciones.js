import sequelize from '../../database/sequelize.js'
import { fn, col, literal, Op } from 'sequelize'
import { Transaccion, TransaccionItem } from '../../database/models/Transaccion.js'
import { Socio } from '../../database/models/Socio.js'
import { Articulo } from '../../database/models/Articulo.js'
import { Kardex } from '../../database/models/Kardex.js'
import { applyFilters } from '../../utils/mine.js'
import cSistema from "../_sistema/cSistema.js"
import { Colaborador } from '../../database/models/Colaborador.js'
import { Mesa } from '../../database/models/Mesa.js'
import { CajaApertura } from '../../database/models/CajaApertura.js'
import { Salon } from '../../database/models/Salon.js'
import { ProduccionArea } from '../../database/models/ProduccionArea.js'
import { PagoMetodo } from '../../database/models/PagoMetodo.js'

const include1 = {
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
    venta_mesa1: {
        model: Mesa,
        as: 'venta_mesa1',
        attributes: ['id', 'nombre'],
        include: {
            model: Salon,
            as: 'salon1',
            attributes: ['id', 'nombre']
        }
    }
}

const create = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador, empresa } = req.user
        const {
            tipo, fecha, socio,
            pago_condicion, monto,
            observacion, estado, anulado_motivo,
            compra_comprobante, compra_comprobante_serie, compra_comprobante_correlativo,
            venta_codigo, venta_canal, venta_mesa, venta_pago_metodo, venta_pago_con, venta_socio_datos, venta_entregado,
            transaccion_items,
        } = req.body

        let caja_apertura = null
        if (tipo == 2) {
            caja_apertura = await CajaApertura.findOne({
                where: { estado: '1', empresa: empresa.id }
            })

            if (caja_apertura == null) {
                await transaction.rollback()
                return res.json({ code: 1, msg: 'La caja no fue aperturada, no se puede generar pedidos' })
            }
        }

        // --- CREAR --- //
        const nuevo = await Transaccion.create({
            tipo, fecha, socio,
            pago_condicion, monto,
            observacion, estado, anulado_motivo,
            compra_comprobante, compra_comprobante_serie, compra_comprobante_correlativo,
            venta_codigo, venta_canal, venta_mesa, venta_pago_metodo, venta_pago_con, venta_socio_datos, venta_entregado,
            caja_apertura: caja_apertura.id,
            empresa: empresa.id,
            createdBy: colaborador
        }, { transaction })

        // --- GUARDAR ITEMS --- //
        const items = transaccion_items.map(a => ({
            articulo: a.articulo,
            cantidad: a.cantidad,
            pu: a.pu,
            igv_afectacion: a.igv_afectacion,
            igv_porcentaje: a.igv_porcentaje,
            observacion: a.observacion,
            transaccion: nuevo.id,
            has_receta: a.has_receta,
            receta_insumos: a.receta_insumos,
            is_combo: a.is_combo,
            combo_articulos: a.combo_articulos,
            empresa: empresa.id,
            createdBy: colaborador
        }))

        await TransaccionItem.bulkCreate(items, { transaction })

        if (tipo == 1) {
            // --- GUARAR KARDEX --- //
            const kardexItems = transaccion_items.map(a => ({
                tipo,
                fecha,
                articulo: a.articulo,
                cantidad: a.cantidad,
                estado,
                transaccion: nuevo.id,
                empresa: empresa.id,
                createdBy: colaborador
            }))

            await Kardex.bulkCreate(kardexItems, { transaction })

            // --- ACTUALIZAR STOCK --- //
            const transaccion_tiposMap = cSistema.arrayMap('kardex_tipos')
            const tipoInfo = transaccion_tiposMap[tipo]

            for (const a of transaccion_items) {
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
        }

        await transaction.commit()

        // --- DEVOLVER --- //
        const data = await loadOne(nuevo.id)
        res.json({ code: 0, data })
    }
    catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const update = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador } = req.user
        const { id } = req.params
        const {
            tipo, fecha, socio,
            pago_condicion, monto,
            observacion, estado, anulado_motivo,
            compra_comprobante, compra_comprobante_serie, compra_comprobante_correlativo,
            venta_codigo, venta_canal, venta_mesa, venta_pago_metodo, venta_pago_con, venta_socio_datos, venta_entregado,
            transaccion_items,
        } = req.body

        const [affectedRows] = await Transaccion.update({
            tipo, fecha, socio,
            pago_condicion, monto,
            observacion, estado, anulado_motivo,
            compra_comprobante, compra_comprobante_serie, compra_comprobante_correlativo,
            venta_codigo, venta_canal, venta_mesa, venta_pago_metodo, venta_pago_con, venta_socio_datos, venta_entregado,
            updatedBy: colaborador
        }, {
            where: { id },
            transaction
        })

        if (affectedRows > 0) {
            await transaction.commit()

            const data = await loadOne(id)
            res.json({ code: 0, data })
        }
        else {
            await transaction.commit()

            res.json({ code: 1, msg: 'No se actualizó ningún registro' })
        }
    }
    catch (error) {
        await transaction.rollback()

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
            include: []
        }

        const sqls = {
            comprobantes_monto: [
                literal(`(SELECT COALESCE(SUM(c.monto), 0) FROM comprobantes AS c WHERE c.transaccion = "transacciones"."id")`),
                "comprobantes_monto"
            ],
            pagos_monto: [
                literal(`(SELECT COALESCE(SUM(c.monto), 0) FROM dinero_movimientos AS c WHERE c.transaccion = "transacciones"."id")`),
                "pagos_monto"
            ]
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
                const excludeCols = [
                    'timeAgo', 'comprobantes_monto', 'pagos_monto', 'more_info',
                    'hora', 'salon', 'mesa',
                ]
                const cols1 = qry.cols.filter(a => !excludeCols.includes(a))
                findProps.attributes = findProps.attributes.concat(cols1)

                // --- AGREAGAR LOS REF QUE SI ESTÁN EN LA BD --- //
                if (qry.cols.includes('socio')) findProps.include.push(include1.socio1)
            }

            if (qry.sqls) {
                for (const a of qry.sqls) {
                    if (sqls[a]) findProps.attributes.push(sqls[a])
                }
            }
        }

        let data = await Transaccion.findAll(findProps)

        if (data.length > 0 && qry.cols) {
            data = data.map(a => a.toJSON())

            const venta_canalesMap = cSistema.arrayMap('venta_canales')
            const pago_condicionesMap = cSistema.arrayMap('pago_condiciones')
            const transaccion_estadosMap = cSistema.arrayMap('transaccion_estados')
            const estados = cSistema.arrayMap('estados')

            for (const a of data) {
                if (qry.cols.includes('venta_canal')) a.venta_canal1 = venta_canalesMap[a.venta_canal]
                if (qry.cols.includes('pago_condicion')) a.pago_condicion1 = pago_condicionesMap[a.pago_condicion]
                if (qry.cols.includes('estado')) a.estado1 = transaccion_estadosMap[a.estado]
                if (qry.cols.includes('venta_facturado')) a.venta_facturado1 = estados[a.venta_facturado]
                if (qry.cols.includes('venta_entregado')) a.venta_entregado1 = estados[a.venta_entregado]
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

        let data = await Transaccion.findByPk(id, {
            include: [
                {
                    model: TransaccionItem,
                    as: 'transaccion_items',
                    include: [
                        {
                            model: Articulo,
                            as: 'articulo1',
                            attributes: ['nombre', 'unidad'],
                            include: {
                                model: ProduccionArea,
                                as: 'produccion_area1',
                                attributes: ['impresora']
                            }
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
                    attributes: ['id', 'nombre'],
                    include: {
                        model: Salon,
                        as: 'salon1',
                        attributes: ['id', 'nombre']
                    }
                },
                {
                    model: PagoMetodo,
                    as: 'venta_pago_metodo1',
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

        await TransaccionItem.destroy({
            where: { transaccion: id },
            transaction
        })

        await Transaccion.destroy({
            where: { id },
            transaction
        })

        if (estado != 0) {
            const transaccion_items = await TransaccionItem.findAll({
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



// --- Funciones --- //
async function loadOne(id) {
    let data = await Transaccion.findByPk(id, {
        include: [include1.socio1, include1.createdBy1]
    })

    if (data) {
        data = data.toJSON()

        const pago_condicionesMap = cSistema.arrayMap('pago_condiciones')
        const transaccion_estadosMap = cSistema.arrayMap('transaccion_estados')
        const estados = cSistema.arrayMap('estados')

        data.pago_condicion1 = pago_condicionesMap[data.pago_condicion]
        data.estado1 = transaccion_estadosMap[data.estado]
        data.venta_facturado1 = estados[data.venta_facturado]
        data.venta_entregado1 = estados[data.venta_entregado]
    }

    return data
}


// --- Para ventas --- //
const addProductos = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador, empresa } = req.user
        const { id } = req.params
        const { monto, transaccion_items } = req.body

        const items = transaccion_items.map(a => ({
            articulo: a.articulo,
            cantidad: a.cantidad,
            pu: a.pu,
            igv_afectacion: a.igv_afectacion,
            igv_porcentaje: a.igv_porcentaje,
            observacion: a.observacion,
            transaccion: id,
            has_receta: a.has_receta,
            receta_insumos: a.receta_insumos,
            is_combo: a.is_combo,
            combo_articulos: a.combo_articulos,
            empresa: empresa.id,
            createdBy: colaborador
        }))

        await TransaccionItem.bulkCreate(items, { transaction })

        await Transaccion.update(
            {
                monto: sequelize.literal(`COALESCE(monto, 0) + ${monto}`),
                updatedBy: colaborador
            },
            {
                where: { id },
                transaction
            }
        )

        await transaction.commit()

        res.json({ code: 0 })
    }
    catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const anular = async (req, res) => {
    try {
        const { colaborador } = req.user
        const { id } = req.params
        const { anulado_motivo, item } = req.body

        await Transaccion.update(
            {
                estado: 0,
                anulado_motivo,
                updatedBy: colaborador
            },
            {
                where: { id }
            }
        )

        res.json({ code: 0 })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const ventasPendientes = async (req, res) => {
    try {
        const { empresa } = req.user

        const findProps = {
            attributes: [
                'venta_canal',
                [fn('COUNT', col('id')), 'cantidad']
            ],
            where: {
                tipo: '2',
                estado: '1',
                empresa: empresa.id
            },
            group: ['venta_canal'],
        }

        const data = await Transaccion.findAll(findProps)

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const cambiarMesa = async (req, res) => {
    try {
        const { colaborador } = req.user
        const { id } = req.params
        const { venta_mesa } = req.body

        // --- ENTREGAR Y FINALIZAR --- //
        await Transaccion.update(
            {
                venta_mesa,
                updatedBy: colaborador
            },
            { where: { id } }
        )

        res.json({ code: 0 })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const entregar = async (req, res) => {
    try {
        const { colaborador } = req.user
        const { id } = req.params

        // --- ENTREGAR Y FINALIZAR --- //
        await Transaccion.update(
            {
                venta_entregado: true,
                estado: 2,
                updatedBy: colaborador
            },
            { where: { id } }
        )

        const data = await loadOne(id)
        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

export default {
    create,
    update,
    find,
    findById,
    delet,

    addProductos,
    anular,
    ventasPendientes,
    cambiarMesa,
    entregar,
}