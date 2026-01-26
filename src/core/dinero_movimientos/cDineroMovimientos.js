import { DineroMovimientoRepository } from '#db/repositories.js'
import { arrayMap } from '#store/system.js'
import { resDeleteFalse } from '#http/helpers.js'

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        qry.fltr.empresa = { op: 'Es', val: empresa }

        const data = await DineroMovimientoRepository.find(qry, true)

        if (data.length > 0) {
            const caja_operacion_tiposMap = arrayMap('caja_operacion_tipos')
            const caja_operacionesMap = arrayMap('caja_operaciones')
            const dinero_movimiento_estadosMap = arrayMap('dinero_movimiento_estados')

            for (const a of data) {
                if (qry?.cols?.includes('tipo')) a.tipo1 = caja_operacion_tiposMap[a.tipo]
                if (qry?.cols?.includes('operacion')) a.operacion1 = caja_operacionesMap[a.operacion]
                if (qry?.cols?.includes('estado')) a.estado1 = dinero_movimiento_estadosMap[a.estado]
            }
        }

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const create = async (req, res) => {
    try {
        const { colaborador, empresa } = req.user
        const {
            fecha,
            tipo,
            operacion,
            detalle,

            pago_metodo,
            monto,

            comprobante,
            caja_apertura,
        } = req.body

        // --- CREAR --- //
        const nuevo = await DineroMovimientoRepository.create({
            fecha,
            tipo,
            operacion,
            detalle,

            pago_metodo,
            monto,

            comprobante,
            caja_apertura,

            sucursal: req.sucursal.id,
            empresa,
            createdBy: colaborador,
        })

        const data = await loadOne(nuevo.id)

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const delet = async (req, res) => {
    try {
        const { id } = req.params

        if ((await DineroMovimientoRepository.delete({ id })) == false) return resDeleteFalse(res)

                res.json({ code: 0 })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

// --- Funciones --- //
async function loadOne(id) {
    const data = await DineroMovimientoRepository.find({ id, incl: ['pago_metodo1'] }, true)

    if (data) {
        const caja_operacion_tiposMap = arrayMap('caja_operacion_tipos')
        const caja_operacionesMap = arrayMap('caja_operaciones')
        const dinero_movimiento_estadosMap = arrayMap('dinero_movimiento_estados')

        data.tipo1 = caja_operacion_tiposMap[data.tipo]
        data.operacion1 = caja_operacionesMap[data.operacion]
        data.estado1 = dinero_movimiento_estadosMap[data.estado]
    }

    return data
}

export default {
    find,
    create,
    delet,
}
