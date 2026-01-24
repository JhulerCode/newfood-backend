import sequelize from '#db/sequelize.js'
import { Repository } from '#db/Repository.js'
import { arrayMap } from '#store/system.js'

const repository = new Repository('Kardex')
const ArticuloRepository = new Repository('Articulo')

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        qry.fltr.empresa = { op: 'Es', val: empresa }

        const data = await repository.find(qry, true)

        if (data.length > 0) {
            const kardex_tiposMap = arrayMap('kardex_tipos')

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
        await repository.create(
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

        // await actualizarStock(tipo, articulo, cantidad, transaction)

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
        await repository.delete({ id }, transaction)

        // await actualizarStock(tipo, articulo, cantidad, transaction, -1)

        await transaction.commit()

        res.json({ code: 0 })
    } catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

// --- Helpers --- //
// async function actualizarStock(tipo, articulo, cantidad, transaction, factor = 1) {
//     const kardex_tiposMap = arrayMap('kardex_tipos')
//     const operacion = kardex_tiposMap[tipo].operacion

//     await ArticuloRepository.update(
//         { id: articulo },
//         {
//             stock: sequelize.literal(`COALESCE(stock, 0) + ${cantidad * operacion * factor}`),
//         },
//         transaction,
//     )
// }

export default {
    find,
    create,
    delet,
}
