import sequelize from '#db/sequelize.js'
import {
    TransaccionItemRepository,
    KardexRepository,
    SucursalArticuloRepository,
} from '#db/repositories.js'
import { arrayMap } from '#store/system.js'

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        qry.fltr.empresa = { op: 'Es', val: empresa }

        const data = await TransaccionItemRepository.find(qry, true)

        if (data.length > 0) {
            for (const a of data) {
                a.cantidad_anterior = a.cantidad
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
            cantidad,
            pu,
            igv_afectacion,
            igv_porcentaje,
            observacion,
            transaccion,
        } = req.body

        // --- CREAR --- //
        const nuevo = await TransaccionItemRepository.create(
            {
                articulo,
                cantidad,
                pu,
                igv_afectacion,
                igv_porcentaje,
                observacion,
                transaccion,
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
                cantidad,
                observacion,
                transaccion,
                transaccion_item: nuevo.id,
                empresa,
                createdBy: colaborador,
            },
            transaction,
        )

        // --- ACTUALIZAR STOCK --- //
        await actualizarStock(req.sucursal.id, articulo, tipo, cantidad, transaction)

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
        const { colaborador } = req.user
        const { id } = req.params
        const {
            tipo,
            fecha,
            articulo,
            cantidad,
            cantidad_anterior,
            pu,
            igv_afectacion,
            igv_porcentaje,
            observacion,
            transaccion,
        } = req.body

        const updated = await TransaccionItemRepository.update(
            { id },
            {
                articulo,
                cantidad,
                pu,
                igv_afectacion,
                igv_porcentaje,
                observacion,
                transaccion,
                updatedBy: colaborador,
            },
            transaction,
        )

        if (updated == false) return resUpdateFalse(res)

        // --- ACTUALIZAR KARDEX --- //
        await KardexRepository.update(
            { transaccion_item: id },
            {
                tipo,
                fecha,
                articulo,
                cantidad,
                observacion,
                transaccion,
                updatedBy: colaborador,
            },
            transaction,
        )

        // --- ACTUALIZAR STOCK --- //
        if (cantidad_anterior != cantidad) {
            const cantidad1 = cantidad_anterior - cantidad
            const tipo1 = cantidad1 > 0 ? 2 : 1
            await actualizarStock(
                req.sucursal.id,
                articulo,
                tipo1,
                Math.abs(cantidad1),
                transaction,
            )
        }

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
        const { id } = req.params
        const { tipo, articulo, cantidad } = req.body

        await KardexRepository.destroy({ transaccion_item: id }, transaction)

        await TransaccionItemRepository.destroy({ id }, transaction)

        await actualizarStock(req.sucursal.id, articulo, tipo, cantidad, transaction, -1)

        await transaction.commit()

        res.json({ code: 0 })
    } catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

// --- Helpers --- //
async function actualizarStock(sucursal, articulo, tipo, cantidad, transaction, factor = 1) {
    const kardex_tiposMap = arrayMap('kardex_operaciones')
    const operacion = kardex_tiposMap[tipo].operacion

    await SucursalArticuloRepository.update(
        { sucursal, articulo },
        {
            stock: sequelize.literal(`COALESCE(stock, 0) + ${cantidad * operacion * factor}`),
        },
        transaction,
    )
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
