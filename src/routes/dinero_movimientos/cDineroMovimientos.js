import { CajaApertura } from '../../database/models/CajaApertura.js'
import { Colaborador } from '../../database/models/Colaborador.js'
import { Comprobante, ComprobanteItem } from '../../database/models/Comprobante.js'
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
        attributes: ['id', 'fecha_emision', 'serie', 'numero', 'serie_correlativo', 'monto'],
    },
    transaccion1: {
        model: Transaccion,
        as: 'transaccion1',
        attributes: ['id', 'fecha', 'monto', 'venta_canal'],
    },
    caja_apertura1: {
        model: CajaApertura,
        as: 'caja_apertura1',
        attributes: ['id', 'fecha_apertura', 'fecha_apertura'],
    },
    createdBy1: {
        model: Colaborador,
        as: 'createdBy1',
        attributes: ['id', 'nombres', 'apellidos', 'nombres_apellidos'],
    },
}

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        const findProps = {
            attributes: ['id'],
            order: [['createdAt', 'DESC']],
            where: { empresa: empresa.id },
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
                const excludeCols = []
                const cols1 = qry.cols.filter(a => !excludeCols.includes(a))
                findProps.attributes = findProps.attributes.concat(cols1)
            }
        }

        let data = await DineroMovimiento.findAll(findProps)

        if (data.length > 0) {
            data = data.map(a => a.toJSON())

            const caja_operacion_tiposMap = cSistema.arrayMap('caja_operacion_tipos')
            const caja_operacionesMap = cSistema.arrayMap('caja_operaciones')
            const dinero_movimiento_estadosMap = cSistema.arrayMap('dinero_movimiento_estados')

            for (const a of data) {
                if (qry.cols.includes('tipo')) a.tipo1 = caja_operacion_tiposMap[a.tipo]
                if (qry.cols.includes('operacion')) a.operacion1 = caja_operacionesMap[a.operacion]
                if (qry.cols.includes('estado')) a.estado1 = dinero_movimiento_estadosMap[a.estado]
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
        const { colaborador, empresa } = req.user
        const {
            fecha, tipo, operacion, detalle,
            pago_metodo, monto,
            comrpobante, Transaccion, caja_apertura
        } = req.body

        // --- CREAR --- //
        const nuevo = await DineroMovimiento.create({
            fecha, tipo, operacion, detalle,
            pago_metodo, monto,
            comrpobante, Transaccion, caja_apertura,
            empresa: empresa.id,
            createdBy: colaborador
        })

        const data = await loadOne(nuevo.id)

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

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


// --- Funciones --- //
async function loadOne(id) {
    let data = await DineroMovimiento.findByPk(id, {
        include: [include1.pago_metodo1]
    })

    if (data) {
        data = data.toJSON()

        const caja_operacion_tiposMap = cSistema.arrayMap('caja_operacion_tipos')
        const caja_operacionesMap = cSistema.arrayMap('caja_operaciones')
        const dinero_movimiento_estadosMap = cSistema.arrayMap('dinero_movimiento_estados')

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
    // findResumen,
}