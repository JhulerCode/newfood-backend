import { CajaApertura } from '../../database/models/CajaApertura.js'
// import { CajaMovimiento } from '../../database/models/CajaMovimiento.js'
import { existe, applyFilters } from '../../utils/mine.js'
import cSistema from "../_sistema/cSistema.js"

const create = async (req, res) => {
    try {
        const { colaborador } = req.user
        const { fecha_apertura, fecha_cierre, monto_apertura, monto_cierre } = req.body

        // ----- CREAR ----- //
        const nuevo = await CajaApertura.create({
            fecha_apertura, monto_apertura,
            estado: 1,
            createdBy: colaborador
        })

        const data = await loadOne(nuevo.id)

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const cerrar = async (req, res) => {
    try {
        const { colaborador } = req.user
        const { id } = req.params
        const { fecha_apertura, fecha_cierre, monto_apertura, monto_cierre } = req.body

        // ----- ACTUALIZAR ----- //
        const [affectedRows] = await CajaApertura.update(
            {
                fecha_cierre, monto_cierre,
                estado: 2,
                updatedBy: colaborador
            },
            { where: { id } }
        )

        if (affectedRows > 0) {
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

async function loadOne(id) {
    let data = await CajaApertura.findByPk(id)

    if (data) {
        data = data.toJSON()

        const estadosMap = cSistema.arrayMap('transaccion_estados')

        data.estado1 = estadosMap[data.estado]
    }

    return data
}

const find = async (req, res) => {
    try {
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        const findProps = {
            attributes: ['id'],
            order: [['createdAt', 'DESC']],
            where: {},
        }

        if (qry) {
            if (qry.fltr) {
                Object.assign(findProps.where, applyFilters(qry.fltr))
            }

            if (qry.cols) {
                findProps.attributes = findProps.attributes.concat(qry.cols)
            }
        }

        let data = await CajaApertura.findAll(findProps)

        if (data.length > 0 && qry.cols) {
            data = data.map(a => a.toJSON())

            const estadosMap = cSistema.arrayMap('transaccion_estados')

            for (const a of data) {
                if (qry.cols.includes('estado')) a.estado1 = estadosMap[a.estado]
            }
        }

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

// const findById = async (req, res) => {
//     try {
//         const { id } = req.params

//         const findProps = {
//             include: {
//                 model: CajaMovimiento,
//                 as: 'caja_movimientos',
//             }
//         }

//         const data = await CajaApertura.findByPk(id, findProps)

//         res.json({ code: 0, data })
//     }
//     catch (error) {
//         res.status(500).json({ code: -1, msg: error.message, error })
//     }
// }

// const delet = async (req, res) => {
//     try {
//         const { id } = req.params

//         const deletedCount = await CajaApertura.destroy({ where: { id } })

//         const send = deletedCount > 0 ? { code: 0 } : { code: 1, msg: 'No se eliminó ningún registro' }

//         res.json(send)
//     }
//     catch (error) {
//         res.status(500).json({ code: -1, msg: error.message, error })
//     }
// }

export default {
    create,
    cerrar,
    find,
    // findById,
    // delet,
}