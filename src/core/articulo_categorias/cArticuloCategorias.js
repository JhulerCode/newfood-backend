import { ArticuloCategoriaRepository } from '#db/repositories.js'
import { arrayMap } from '#store/system.js'
import { resUpdateFalse, resDeleteFalse } from '#http/helpers.js'

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        qry.fltr.empresa = { op: 'Es', val: empresa }

        const data = await ArticuloCategoriaRepository.find(qry, true)

        if (data.length > 0) {
            const articulo_tiposMap = arrayMap('articulo_tipos')
            const activo_estadosMap = arrayMap('activo_estados')

            for (const a of data) {
                if (qry?.cols?.includes('tipo')) a.tipo1 = articulo_tiposMap[a.tipo]
                if (qry?.cols?.includes('activo')) a.activo1 = activo_estadosMap[a.activo]
            }
        }

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const findById = async (req, res) => {
    try {
        const { id } = req.params

        const data = await ArticuloCategoriaRepository.find({ id })

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const create = async (req, res) => {
    try {
        const { colaborador, empresa } = req.user
        const { tipo, nombre, color, activo } = req.body

        // --- VERIFY SI EXISTE NOMBRE --- //
        if ((await ArticuloCategoriaRepository.existe({ nombre, empresa }, res)) == true) return

        // --- CREAR --- //
        const nuevo = await ArticuloCategoriaRepository.create({
            tipo,
            nombre,
            color,
            activo,
            empresa,
            createdBy: colaborador,
        })

        const data = await loadOne(nuevo.id)

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const update = async (req, res) => {
    try {
        const { colaborador, empresa } = req.user
        const { id } = req.params
        const { tipo, nombre, color, activo } = req.body

        // --- VERIFY SI EXISTE NOMBRE --- //
        if ((await ArticuloCategoriaRepository.existe({ nombre, id, empresa }, res)) == true) return

        // --- ACTUALIZAR --- //
        const updated = await ArticuloCategoriaRepository.update(
            { id },
            {
                tipo,
                nombre,
                color,
                activo,
                updatedBy: colaborador,
            },
        )

        if (updated == false) return resUpdateFalse(res)

        const data = await loadOne(id)

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const delet = async (req, res) => {
    try {
        const { id } = req.params

        if ((await ArticuloCategoriaRepository.delete({ id })) == false) return resDeleteFalse(res)

        res.json({ code: 0 })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

// --- Funciones --- //
async function loadOne(id) {
    const data = await ArticuloCategoriaRepository.find({ id }, true)

    if (data) {
        const articulo_tiposMap = arrayMap('articulo_tipos')
        const activo_estadosMap = arrayMap('activo_estados')

        data.tipo1 = articulo_tiposMap[data.tipo]
        data.activo1 = activo_estadosMap[data.activo]
    }

    return data
}

export default {
    find,
    findById,
    create,
    delet,
    update,
}
