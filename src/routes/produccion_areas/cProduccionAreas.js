import { ProduccionArea } from '../../database/models/ProduccionArea.js'
import { applyFilters } from '../../utils/mine.js'
import cSistema from "../_sistema/cSistema.js"

const create = async (req, res) => {
    try {
        const { colaborador } = req.user
        const {
            nombre, impresora, activo,
        } = req.body

       // --- ACTUALIZAR --- //
        const nuevo = await ProduccionArea.create(
            {
                nombre, impresora, activo,
                createdBy: colaborador
            }
        )

        const data = await loadOne(nuevo.id)
        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const update = async (req, res) => {
    try {
        const { id } = req.params
        const { colaborador } = req.user
        const {
            nombre, impresora, activo,
        } = req.body

       // --- ACTUALIZAR --- //
        const [affectedRows] = await ProduccionArea.update(
            {
                nombre, impresora, activo,
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
    let data = await ProduccionArea.findByPk(id)

    if (data) {
        data = data.toJSON()

        const activo_estadosMap = cSistema.arrayMap('activo_estados')
        data.activo1 = activo_estadosMap[data.activo]
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

        let data = await ProduccionArea.findAll(findProps)

        if (data.length > 0) {
            data = data.map(a => a.toJSON())

            const activo_estadosMap = cSistema.arrayMap('activo_estados')

            for (const a of data) {
                if (qry.cols.includes('activo')) a.activo1 = activo_estadosMap[a.activo]
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

        const data = await ProduccionArea.findByPk(id)

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const delet = async (req, res) => {
    try {
        const { id } = req.params

       // --- ACTUALIZAR --- //
        const deletedCount = await ProduccionArea.destroy({ where: { id } })

        const send = deletedCount > 0 ? { code: 0 } : { code: 1, msg: 'No se eliminó ningún registro' }

        res.json(send)
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

export default {
    find,
    findById,
    create,
    update,
    delet,
}