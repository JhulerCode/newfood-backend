import sequelize from '../../database/sequelize.js'
import { Transaccion, TransaccionItem } from '../../database/models/Transaccion.js'
import { Articulo } from '../../database/models/Articulo.js'
import { Kardex } from '../../database/models/Kardex.js'
import { applyFilters } from '../../utils/mine.js'
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

        // ----- CREAR ----- //
        const nuevo = await TransaccionItem.create({
            tipo, fecha,
            articulo, cantidad,
            pu, igv_afectacion, igv_porcentaje,
            observacion,
            transaccion,
            createdBy: colaborador
        }, { transaction })

        // ----- GUARAR KARDEX ----- //
        await Kardex.create({
            tipo, fecha,
            articulo, cantidad,
            pu, igv_afectacion, igv_porcentaje,
            observacion,
            estado: 1,
            transaccion,
            createdBy: colaborador
        }, { transaction })

        // ----- ACTUALIZAR STOCK ----- //
        await actualizarStock(tipo, articulo, cantidad, transaction)

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
            // ----- ACTUALIZAR KARDEX ----- //
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

            // ----- ACTUALIZAR STOCK ----- //
            if (cantidad_anterior != cantidad) {
                const cantidad1 = cantidad_anterior - cantidad
                const tipo1 = cantidad1 > 0 ? 2 : 1 // si la cantidad1 es positiva, se está reduciendo el stock (tipo 2), si es negativa, se está aumentando (tipo 1)
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
    // console.log(tipo, articulo, cantidad)
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
    let data = await TransaccionItem.findByPk(id, {
        // include: {
        //     model: Articulo,
        //     as: 'articulo1',
        //     attributes: ['nombre', 'unidad']
        // }
    })

    if (data) {
        data = data.toJSON()
        data.cantidad_anterior = data.cantidad
    }

    return data
}

// const find = async (req, res) => {
//     try {
//         const qry = req.query.qry ? JSON.parse(req.query.qry) : null

//         const findProps = {
//             attributes: ['id'],
//             order: [['createdAt', 'DESC']],
//             where: {},
//             include: []
//         }

//         if (qry) {
//             if (qry.fltr) {
//                 Object.assign(findProps.where, applyFilters(qry.fltr))
//             }

//             if (qry.cols) {
//                 findProps.attributes = findProps.attributes.concat(qry.cols)

//                 // ----- AGREAGAR LOS REF QUE SI ESTÁN EN LA BD ----- //
//                 if (qry.cols.includes('socio')) findProps.include.push(includes.socio1)
//             }

//             if (qry.incl) {
//                 for (const a of qry.incl) {
//                     if (qry.incl.includes(a)) findProps.include.push(includes[a])
//                 }
//             }
//         }

//         let data = await Transaccion.findAll(findProps)

//         if (data.length > 0 && qry.cols) {
//             data = data.map(a => a.toJSON())

//             const pago_condicionesMap = cSistema.arrayMap('pago_condiciones')
//             const transaccion_estadosMap = cSistema.arrayMap('transaccion_estados')

//             for (const a of data) {
//                 if (qry.cols.includes('pago_condicion')) a.pago_condicion1 = pago_condicionesMap[a.pago_condicion]
//                 if (qry.cols.includes('estado')) a.estado1 = transaccion_estadosMap[a.estado]
//             }
//         }

//         res.json({ code: 0, data })
//     }
//     catch (error) {
//         res.status(500).json({ code: -1, msg: error.message, error })
//     }
// }

// const findById = async (req, res) => {
//     try {
//         const { id } = req.params

//         let data = await Transaccion.findByPk(id, {
//             include: [
//                 {
//                     model: TransaccionItem,
//                     as: 'transaccion_items',
//                     include: [
//                         {
//                             model: Articulo,
//                             as: 'articulo1',
//                             attributes: ['nombre', 'unidad']
//                         },
//                     ]
//                 },
//                 {
//                     model: Socio,
//                     as: 'socio1',
//                     attributes: ['id', 'nombres']
//                 },
//             ]
//         })

//         // if (data) {
//         //     data = data.toJSON()
//         // }

//         res.json({ code: 0, data })
//     }
//     catch (error) {
//         res.status(500).json({ code: -1, msg: error.message, error })
//     }
// }

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

        // ----- ACTUALIZAR STOCK ----- //
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
    // find,
    // findById,
    delet,
}