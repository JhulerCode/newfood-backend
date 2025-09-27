import { ProduccionArea } from '../../database/models/ProduccionArea.js'
import { existe, applyFilters } from '../../utils/mine.js'
import { actualizarSesion } from '../_signin/sessions.js'
import cSistema from "../_sistema/cSistema.js"

const create = async (req, res) => {
    try {
        const { colaborador, empresa } = req.user
        const {
            nombre, impresora_tipo, impresora, activo,
        } = req.body

        // --- VERIFY SI EXISTE NOMBRE --- //
        if (await existe(ProduccionArea, { nombre, empresa: empresa.id }, res) == true) return

        // --- CREAR --- //
        const nuevo = await ProduccionArea.create(
            {
                nombre, impresora_tipo, impresora, activo,
                empresa: empresa.id,
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
        const { colaborador, empresa } = req.user
        const { id } = req.params
        const {
            nombre, impresora_tipo, impresora, activo,
        } = req.body

        // --- VERIFY SI EXISTE NOMBRE --- //
        if (await existe(ProduccionArea, { nombre, empresa: empresa.id, id }, res) == true) return

        // --- ACTUALIZAR --- //
        const [affectedRows] = await ProduccionArea.update(
            {
                nombre, impresora_tipo, impresora, activo,
                updatedBy: colaborador
            },
            {
                where: { id },
            }
        )

        if (affectedRows > 0) {
            actualizarSesion(id, { impresora_caja: { id, nombre, impresora_tipo, impresora, activo } })

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

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        const findProps = {
            attributes: ['id'],
            order: [['nombre', 'ASC']],
            where: { empresa: empresa.id },
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
            const impresora_tiposMap = cSistema.arrayMap('impresora_tipos')

            for (const a of data) {
                if (qry.cols.includes('activo')) a.activo1 = activo_estadosMap[a.activo]
                if (qry.cols.includes('impresora_tipo')) a.impresora_tipo1 = impresora_tiposMap[a.impresora_tipo]
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


// --- Funciones --- //
async function loadOne(id) {
    let data = await ProduccionArea.findByPk(id)

    if (data) {
        data = data.toJSON()

        const activo_estadosMap = cSistema.arrayMap('activo_estados')
        const impresora_tiposMap = cSistema.arrayMap('impresora_tipos')

        data.activo1 = activo_estadosMap[data.activo]
        data.impresora_tipo1 = impresora_tiposMap[data.impresora_tipo]
    }

    return data
}

export default {
    find,
    findById,
    create,
    update,
    delet,
}