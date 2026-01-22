import { SalonRepository } from '#db/repositories.js'
import { arrayMap } from '#store/system.js'

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        qry.fltr.empresa = { op: 'Es', val: empresa }

        let data = await SalonRepository.find(qry, true)

        if (data.length > 0) {
            const activo_estadosMap = arrayMap('activo_estados')

            for (const a of data) {
                if (qry?.cols?.includes('activo')) a.activo1 = activo_estadosMap[a.activo]
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

        const data = await SalonRepository.find({ id })

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
            nombre, activo, sucursal,
        } = req.body

        // --- VERIFY SI EXISTE NOMBRE --- //
        if (await SalonRepository.existe({ nombre, empresa }, res) == true) return

        // --- CREAR --- //
        const nuevo = await SalonRepository.create({
            nombre, activo,
            sucursal,
            empresa,
            createdBy: colaborador
        })

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
            nombre, activo,
        } = req.body

        // --- VERIFY SI EXISTE NOMBRE --- //
        if (await SalonRepository.existe({ nombre, id, empresa }, res) == true) return

        // --- ACTUALIZAR --- //
        const updated = await SalonRepository.update({ id }, {
            nombre, activo,
            updatedBy: colaborador
        })

        if (updated == false) return resUpdateFalse(res)

        const data = await loadOne(id)

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
        if (await SalonRepository.delete({ id }) == false) return resDeleteFalse(res)

        res.json({ code: 0 })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}


// --- Funciones --- //
async function loadOne(id) {
    const data = await SalonRepository.find({ id, incl: ['sucursal1'] }, true)

    if (data) {
        const activo_estadosMap = arrayMap('activo_estados')
        data.activo1 = activo_estadosMap[data.activo]
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