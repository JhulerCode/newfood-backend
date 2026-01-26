import sequelize from '#db/sequelize.js'
import { KardexRepository, SucursalArticuloRepository } from '#db/repositories.js'
import { arrayMap } from '#store/system.js'

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

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
        const { tipo, fecha, articulo, cantidad, observacion, estado, transaccion } = req.body

        // --- CREAR --- //
        await KardexRepository.create(
            {
                tipo,
                fecha,

                articulo,
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

        await actualizarStock(req.sucursal.id, articulo, tipo, cantidad, transaction)

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
        const { id } = req.params
        const { tipo, articulo, cantidad } = req.body

        // --- ELIMINAR --- //
        await KardexRepository.delete({ id }, transaction)

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

export default {
    find,
    create,
    delet,
}
