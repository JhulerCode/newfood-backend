import sequelize from '../../database/sequelize.js'
import { Transaccion, TransaccionItem } from '../../database/models/Transaccion.js'
import { Socio } from '../../database/models/Socio.js'
import { Articulo } from '../../database/models/Articulo.js'
import { Kardex } from '../../database/models/Kardex.js'
import { applyFilters } from '../../utils/mine.js'
import cSistema from "../_sistema/cSistema.js"

const includes = {
    socio1: {
        model: Socio,
        as: 'socio1',
        attributes: ['id', 'nombres']
    },
}

const create = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador } = req.user
        const {
            tipo, fecha, socio,
            pago_comprobante, pago_comprobante_serie, pago_comprobante_correlativo,
            pago_condicion, monto,
            observacion, estado,
            transaccion_items,
        } = req.body

        // ----- CREAR ----- //
        const nuevo = await Transaccion.create({
            tipo, fecha, socio,
            pago_comprobante, pago_comprobante_serie, pago_comprobante_correlativo,
            pago_condicion, monto,
            observacion, estado,
            createdBy: colaborador
        }, { transaction })

        // ----- GUARDAR ITEMS ----- //
        const items = transaccion_items.map(a => ({
            tipo, fecha,
            articulo: a.articulo,
            cantidad: a.cantidad,
            pu: a.pu,
            igv_afectacion: a.igv_afectacion,
            igv_porcentaje: a.igv_porcentaje,
            observacion: a.observacion,
            transaccion: nuevo.id,
            createdBy: colaborador
        }))

        await TransaccionItem.bulkCreate(items, { transaction })

        // ----- GUARAR KARDEX ----- //
        const kardexItems = transaccion_items.map(a => ({
            tipo, fecha,
            articulo: a.articulo,
            cantidad: a.cantidad,
            pu: a.pu,
            igv_afectacion: a.igv_afectacion,
            igv_porcentaje: a.igv_porcentaje,
            observacion: a.observacion,
            estado,
            transaccion: nuevo.id,
            createdBy: colaborador
        }))

        await Kardex.bulkCreate(kardexItems, { transaction })

        // ----- ACTUALIZAR STOCK ----- //
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

        await transaction.commit()

        // ----- DEVOLVER ----- //
        const data = await loadOne(nuevo.id)
        res.json({ code: 0, data })
    }
    catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const update = async (req, res) => {
    try {
        const { colaborador } = req.user
        const { id } = req.params
        const {
            tipo, fecha, socio,
            pago_comprobante, pago_comprobante_serie, pago_comprobante_correlativo,
            pago_condicion, monto,
            observacion, estado,
            transaccion_items,
        } = req.body

        const [affectedRows] = await Transaccion.update({
            tipo, fecha, socio,
            pago_comprobante, pago_comprobante_serie, pago_comprobante_correlativo,
            pago_condicion, monto,
            observacion, estado,
            updatedBy: colaborador
        }, {
            where: { id },
        })

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

async function loadOne(id) {
    let data = await Transaccion.findByPk(id, {
        include: [includes.socio1]
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
            if (qry.fltr) {
                Object.assign(findProps.where, applyFilters(qry.fltr))
            }

            if (qry.cols) {
                findProps.attributes = findProps.attributes.concat(qry.cols)

                // ----- AGREAGAR LOS REF QUE SI ESTÁN EN LA BD ----- //
                if (qry.cols.includes('socio')) findProps.include.push(includes.socio1)
            }

            if (qry.incl) {
                for (const a of qry.incl) {
                    if (qry.incl.includes(a)) findProps.include.push(includes[a])
                }
            }
        }

        let data = await Transaccion.findAll(findProps)

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

        let data = await Transaccion.findByPk(id, {
            include: [
                {
                    model: TransaccionItem,
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

const anular = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador } = req.user
        const { id } = req.params
        const { anulado_motivo, item } = req.body

        const transaccion_itemsPast = await TransaccionItem.findAll({
            where: { transaccion: id },
        })

        const transaccionPast = await Transaccion.findByPk(id)

        await TransaccionItem.destroy({
            where: { transaccion: id },
            transaction
        })

        await Transaccion.destroy({
            where: { id },
            transaction
        })
        let transaccionData = transaccionPast.toJSON()

        if (item.tipo == 5) {
            for (const a of transaccion_itemsPast) {
                await TransaccionItem.update(
                    {
                        stock: sequelize.literal(`COALESCE(stock, 0) + ${a.cantidad}`)
                    },
                    {
                        where: { id: a.lote_padre },
                        transaction
                    }
                )
            }
        }

        if (transaccionData.socio_pedido) {
            for (const a of transaccion_itemsPast) {
                await SocioPedidoItem.update(
                    {
                        entregado: sequelize.literal(`COALESCE(entregado, 0) - ${a.cantidad}`)
                    },
                    {
                        where: { articulo: a.articulo, socio_pedido: transaccionData.socio_pedido },
                        transaction
                    }
                )
            }
        }

        // ----- GUARDAR EL ANULADO ----- //
        transaccionData.estado = 0
        transaccionData.anulado_motivo = anulado_motivo
        transaccionData.updatedBy = colaborador
        const transaccionNew = await Transaccion.create(transaccionData, { transaction })

        const itemsNew = transaccion_itemsPast.map(a => {
            const plain = a.toJSON()
            plain.transaccion = transaccionNew.id
            return plain
        })
        await TransaccionItem.bulkCreate(itemsNew, { transaction })

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
    update,
    find,
    findById,
    delet,
    anular,
}