import { PagoComprobante } from '../../database/models/PagoComprobante.js'
import { applyFilters } from '../../utils/mine.js'
import cSistema from "../_sistema/cSistema.js"

const update = async (req, res) => {
    try {
        const { id } = req.params
        const { colaborador } = req.user
        const {
            nombre, serie, numero, correlativo, activo, estandar
        } = req.body

       // --- ACTUALIZAR --- //
        const [affectedRows] = await PagoComprobante.update(
            {
                nombre, serie, numero, correlativo, activo, estandar,
                updatedBy: colaborador
            },
            {
                where: { id },
            }
        )

        if (affectedRows > 0) {
           // --- DEVOLVER --- //
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
    let data = await PagoComprobante.findByPk(id)

    if (data) {
        data = data.toJSON()

        const activo_estadosMap = cSistema.arrayMap('activo_estados')
        const estadosMap = cSistema.arrayMap('estados')

        data.activo1 = activo_estadosMap[data.activo]
        data.estandar1 = estadosMap[data.estandar]
    }

    return data
}

const find = async (req, res) => {
    try {
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        const findProps = {
            attributes: ['id'],
            order: [['nombre', 'ASC']],
            where: {}
        }

        if (qry) {
            if (qry.fltr) {
                Object.assign(findProps.where, applyFilters(qry.fltr))
            }

            if (qry.cols) {
                findProps.attributes = findProps.attributes.concat(qry.cols)
            }
        }

        let data = await PagoComprobante.findAll(findProps)

        if (data.length > 0 && qry.cols) {
            data = data.map(a => a.toJSON())

            const estadosMap = cSistema.arrayMap('estados')
            const activo_estadosMap = cSistema.arrayMap('activo_estados')

            for (const a of data) {
                if (qry.cols.includes('activo')) a.activo1 = activo_estadosMap[a.activo]
                if (qry.cols.includes('estandar')) a.estandar1 = estadosMap[a.estandar]
            }
        }

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const findById = async (req, res) => {
    try {
        const { id } = req.params

        const data = await PagoComprobante.findByPk(id)
        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

export default {
    find,
    findById,
    update,
}