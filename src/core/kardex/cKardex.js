import sequelize from '#db/sequelize.js'
import { KardexRepository } from '#db/repositories.js'
import { arrayMap } from '#store/system.js'
import { normalizeMovementItems, updateVariantStock } from '#core/articulos/sArticuloVariants.js'

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : {}
        qry.fltr ||= {}
        qry.fltr.empresa = { op: 'Es', val: empresa }

        const data = await KardexRepository.find(qry, true)

        if (data.length > 0) {
            const kardex_tiposMap = arrayMap('kardex_operaciones')

            for (const a of data) {
                // --- DATOS DE LOTE PADRE --- //
                if (a.tipo) {
                    const tipoInfo = kardex_tiposMap[a.tipo]

                    a.tipo1 = tipoInfo
                    a.cantidad *= tipoInfo.operacion
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
        const { tipo, fecha, articulo, articulo_variant, cantidad, observacion } = req.body
        const [movement] = await normalizeMovementItems(
            [{ articulo, articulo_variant, cantidad }],
            empresa,
            transaction,
            { sucursal: req.sucursal.id, requireAvailable: false },
        )

        // --- CREAR --- //
        await KardexRepository.create(
            {
                tipo,
                fecha,

                articulo,
                articulo_variant: movement.articulo_variant,
                cantidad,

                observacion,

                // transaccion,
                // transaccion_item,
                // comprobante,

                sucursal: req.sucursal.id,
                empresa,
                createdBy: colaborador,
            },
            transaction,
        )

        await updateVariantStock(req.sucursal.id, [movement], tipo, transaction, { empresa })

        await transaction.commit()

        res.json({ code: 0 })
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
        const movementModel = await KardexRepository.model.findOne({
            where: { id, empresa },
            attributes: ['tipo', 'articulo', 'articulo_variant', 'cantidad', 'sucursal'],
            transaction,
        })
        if (!movementModel) {
            await transaction.rollback()
            return res.status(404).json({ code: 1, msg: 'Movimiento no encontrado' })
        }
        const movement = movementModel.toJSON()

        // --- ELIMINAR --- //
        await KardexRepository.delete({ id, empresa }, transaction)

        await updateVariantStock(movement.sucursal, [movement], movement.tipo, transaction, {
            empresa,
            factor: -1,
        })

        await transaction.commit()

        res.json({ code: 0 })
    } catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

export default {
    find,
    create,
    delet,
}
