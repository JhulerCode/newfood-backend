import { CajaApertura } from '../../database/models/CajaApertura.js'
import { Comprobante } from '../../database/models/Comprobante.js'
import { DineroMovimiento } from '../../database/models/DineroMovimiento.js'
import { PagoMetodo } from '../../database/models/PagoMetodo.js'
import { Transaccion } from '../../database/models/Transaccion.js'
import { applyFilters } from '../../utils/mine.js'
import cSistema from '../_sistema/cSistema.js'

const include1 = {
    pago_metodo1: {
        model: PagoMetodo,
        as: 'pago_metodo1',
        attributes: ['id', 'nombre'],
    },
    comprobante1: {
        model: Comprobante,
        as: 'comprobante1',
        attributes: ['id', 'venta_fecha_emision', 'venta_serie', 'venta_numero', 'serie_correlativo', 'monto'],
    },
    transaccion1: {
        model: Transaccion,
        as: 'transaccion1',
        attributes: ['id', 'fecha', 'monto'],
    },
    caja_apertura1: {
        model: CajaApertura,
        as: 'caja_apertura1',
        attributes: ['id', 'fecha_apertura', 'fecha_apertura'],
    },
}

const find = async (req, res) => {
    try {
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        const findProps = {
            attributes: ['id'],
            order: [['createdAt', 'DESC']],
            where: {},
            include: [],
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
                findProps.attributes = findProps.attributes.concat(qry.cols)
            }
        }

        let data = await DineroMovimiento.findAll(findProps)

        if (data.length > 0) {
            data = data.map(a => a.toJSON())

            const caja_operacion_tiposMap = cSistema.arrayMap('caja_operacion_tipos')
            const caja_operacionesMap = cSistema.arrayMap('caja_operaciones')

            for (const a of data) {
                if (qry.cols.includes('tipo')) a.tipo1 = caja_operacion_tiposMap[a.tipo]
                if (qry.cols.includes('operacion')) a.operacion1 = caja_operacionesMap[a.operacion]
            }
        }

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const create = async (req, res) => {
    try {
        const { colaborador } = req.user
        const {
            fecha, tipo, operacion, detalle,
            pago_metodo, monto,
            comrpobante, Transaccion, caja_apertura } = req.body

        // ----- CREAR ----- //
        const nuevo = await DineroMovimiento.create({
            fecha, tipo, operacion, detalle,
            pago_metodo, monto,
            comrpobante, Transaccion, caja_apertura,
            createdBy: colaborador
        })

        const data = await loadOne(nuevo.id)

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

async function loadOne(id) {
    let data = await DineroMovimiento.findByPk(id, {
        include: [include1.pago_metodo1]
    })

    if (data) {
        data = data.toJSON()

        const caja_operacion_tiposMap = cSistema.arrayMap('caja_operacion_tipos')
        const caja_operacionesMap = cSistema.arrayMap('caja_operaciones')

        data.tipo1 = caja_operacion_tiposMap[data.tipo]
        data.operacion1 = caja_operacionesMap[data.operacion]
    }

    return data
}

// const update = async (req, res) => {
//     try {
//         const { id } = req.params
//         const { colaborador } = req.user
//         const { fecha, detalle, monto } = req.body

//         // ----- ACTUALIZAR ----- //
//         const [affectedRows] = await DineroMovimiento.update(
//             {
//                 fecha, detalle, monto,
//                 updatedBy: colaborador
//             },
//             { where: { id } }
//         )

//         if (affectedRows > 0) {
//             const data = await DineroMovimiento.findByPk(id)

//             res.json({ code: 0, data })
//         }
//         else {
//             res.json({ code: 1, msg: 'No se actualizó ningú registro' })
//         }
//     }
//     catch (error) {
//         res.status(500).json({ code: -1, msg: error.message, error })
//     }
// }

const delet = async (req, res) => {
    try {
        const { id } = req.params

        const deletedCount = await DineroMovimiento.destroy({ where: { id } })

        const send = deletedCount > 0 ? { code: 0 } : { code: 1, msg: 'No se eliminó ningún registro' }

        res.json(send)
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

export default {
    find,
    create,
    // update,
    delet,
}