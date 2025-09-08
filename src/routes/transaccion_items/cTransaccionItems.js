import sequelize from '../../database/sequelize.js'
import { TransaccionItem } from '../../database/models/Transaccion.js'
import { Articulo } from '../../database/models/Articulo.js'
import { Kardex } from '../../database/models/Kardex.js'
import cSistema from "../_sistema/cSistema.js"

const create = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador } = req.user
        const {
            tipo, fecha,
            articulo, cantidad,
            pu, igv_afectacion, igv_porcentaje,
            observacion,
            transaccion,
        } = req.body

       // --- CREAR --- //
        const nuevo = await TransaccionItem.create({
            tipo, fecha,
            articulo, cantidad,
            pu, igv_afectacion, igv_porcentaje,
            observacion,
            transaccion,
            createdBy: colaborador
        }, { transaction })

       // --- GUARAR KARDEX --- //
        await Kardex.create({
            tipo, fecha,
            articulo, cantidad,
            pu, igv_afectacion, igv_porcentaje,
            observacion,
            estado: 1,
            transaccion,
            createdBy: colaborador
        }, { transaction })

       // --- ACTUALIZAR STOCK --- //
        await actualizarStock(tipo, articulo, cantidad, transaction)

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
            tipo, fecha,
            articulo, cantidad, cantidad_anterior,
            pu, igv_afectacion, igv_porcentaje,
            observacion,
            transaccion,
        } = req.body

        const [affectedRows] = await TransaccionItem.update({
            tipo, fecha,
            articulo, cantidad,
            pu, igv_afectacion, igv_porcentaje,
            observacion,
            transaccion,
            updatedBy: colaborador
        }, {
            where: { id },
            transaction
        })

        if (affectedRows > 0) {
           // --- ACTUALIZAR KARDEX --- //
            await Kardex.update({
                tipo, fecha,
                articulo, cantidad,
                pu, igv_afectacion, igv_porcentaje,
                observacion,
                transaccion,
                updatedBy: colaborador
            }, {
                where: { id },
                transaction
            })

           // --- ACTUALIZAR STOCK --- //
            if (cantidad_anterior != cantidad) {
                const cantidad1 = cantidad_anterior - cantidad
                const tipo1 = cantidad1 > 0 ? 2 : 1
                await actualizarStock(tipo1, articulo, Math.abs(cantidad1), transaction)
            }

            await transaction.commit()

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

async function actualizarStock(tipo, articulo, cantidad, transaction) {
    const transaccion_tiposMap = cSistema.arrayMap('kardex_tipos')
    const tipoInfo = transaccion_tiposMap[tipo]

    await Articulo.update(
        {
            stock: sequelize.literal(`COALESCE(stock, 0) ${tipoInfo.operacion == 1 ? '+' : '-'} ${cantidad}`)
        },
        {
            where: { id: articulo },
            transaction
        }
    )
}

async function loadOne(id) {
    let data = await TransaccionItem.findByPk(id)

    if (data) {
        data = data.toJSON()
        data.cantidad_anterior = data.cantidad
    }

    return data
}

const delet = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { id } = req.params
        const { tipo, articulo, cantidad, transaccion } = req.body

        await Kardex.destroy({
            where: { articulo: id, transaccion },
            transaction
        })

        await TransaccionItem.destroy({
            where: { id },
            transaction
        })

       // --- ACTUALIZAR STOCK --- //
        const tipo1 = tipo == 1 ? 2 : 1
        await actualizarStock(tipo1, articulo, cantidad, transaction)

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
    delet,
}