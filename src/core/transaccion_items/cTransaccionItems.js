import sequelize from '#db/sequelize.js'
import {
    TransaccionItemRepository,
    KardexRepository,
} from '#db/repositories.js'
import { resUpdateFalse } from '#http/helpers.js'
import { normalizeMovementItems } from '#core/articulos/sArticuloVariants.js'

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : {}
        qry.fltr ||= {}
        qry.fltr.empresa = { op: 'Es', val: empresa }

        const data = await TransaccionItemRepository.find(qry, true)

        if (data.length > 0) {
            for (const a of data) {
                a.cantidad_anterior = a.cantidad
                if (a.articulo1 && a.articulo_variant1?.nombre) {
                    a.articulo1.nombre = `${a.articulo1.nombre} / ${a.articulo_variant1.nombre}`
                }
            }
        }

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const create = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador, empresa } = req.user
        const {
            tipo,
            fecha,
            articulo,
            articulo_variant,
            cantidad,
            pu,
            igv_afectacion,
            igv_porcentaje,
            observacion,
            transaccion,
        } = req.body
        const [movement] = await normalizeMovementItems(
            [{ articulo, articulo_variant, cantidad }],
            empresa,
            transaction,
            { sucursal: req.sucursal.id, requireAvailable: true },
        )

        // --- CREAR --- //
        const nuevo = await TransaccionItemRepository.create(
            {
                articulo,
                articulo_variant: movement.articulo_variant,
                cantidad,
                pu,
                igv_afectacion,
                igv_porcentaje,
                observacion,
                transaccion,
                sucursal: req.sucursal.id,
                empresa,
                createdBy: colaborador,
            },
            transaction,
        )

        // --- GUARAR KARDEX --- //
        await KardexRepository.create(
            {
                tipo,
                fecha,
                articulo,
                articulo_variant: movement.articulo_variant,
                cantidad,
                observacion,
                transaccion,
                transaccion_item: nuevo.id,
                sucursal: req.sucursal.id,
                empresa,
                createdBy: colaborador,
            },
            transaction,
        )

        await transaction.commit()

        // --- DEVOLVER --- //
        const data = await loadOne(nuevo.id)
        res.json({ code: 0, data })
    } catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const update = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador, empresa } = req.user
        const { id } = req.params
        const {
            tipo,
            fecha,
            articulo,
            articulo_variant,
            cantidad,
            pu,
            igv_afectacion,
            igv_porcentaje,
            observacion,
            transaccion,
        } = req.body
        const oldItemModel = await TransaccionItemRepository.model.findOne({
            where: { id, empresa },
            attributes: ['sucursal'],
            transaction,
        })
        if (!oldItemModel) {
            await transaction.rollback()
            return res.status(404).json({ code: 1, msg: 'Ítem no encontrado' })
        }
        const oldItem = oldItemModel.toJSON()
        const oldKardexModel = await KardexRepository.model.findOne({
            where: { transaccion_item: id, empresa },
            attributes: ['sucursal'],
            transaction,
        })
        const oldKardex = oldKardexModel?.toJSON()
        const movementSucursal = oldKardex?.sucursal || oldItem.sucursal || req.sucursal.id
        const [movement] = await normalizeMovementItems(
            [{ articulo, articulo_variant, cantidad }],
            empresa,
            transaction,
            { sucursal: movementSucursal, requireAvailable: true },
        )

        const updated = await TransaccionItemRepository.update(
            { id, empresa },
            {
                articulo,
                articulo_variant: movement.articulo_variant,
                cantidad,
                pu,
                igv_afectacion,
                igv_porcentaje,
                observacion,
                transaccion,
                sucursal: movementSucursal,
                updatedBy: colaborador,
            },
            transaction,
        )

        if (updated == false) {
            await transaction.rollback()
            return resUpdateFalse(res)
        }

        // --- ACTUALIZAR KARDEX --- //
        await KardexRepository.update(
            { transaccion_item: id, empresa },
            {
                tipo,
                fecha,
                articulo,
                articulo_variant: movement.articulo_variant,
                cantidad,
                observacion,
                transaccion,
                sucursal: movementSucursal,
                updatedBy: colaborador,
            },
            transaction,
        )

        await transaction.commit()

        const data = await loadOne(id)
        res.json({ code: 0, data })
    } catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const delet = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { empresa } = req.user
        const { id } = req.params
        const itemModel = await TransaccionItemRepository.model.findOne({
            where: { id, empresa },
            attributes: ['id'],
            transaction,
        })
        if (!itemModel) {
            await transaction.rollback()
            return res.status(404).json({ code: 1, msg: 'Ítem no encontrado' })
        }
        await KardexRepository.delete({ transaccion_item: id, empresa }, transaction)

        await TransaccionItemRepository.delete({ id, empresa }, transaction)

        await transaction.commit()

        res.json({ code: 0 })
    } catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

async function loadOne(id) {
    const data = await TransaccionItemRepository.find({ id }, true)

    if (data) {
        data.cantidad_anterior = data.cantidad
    }

    return data
}

export default {
    find,
    create,
    update,
    delet,
}
