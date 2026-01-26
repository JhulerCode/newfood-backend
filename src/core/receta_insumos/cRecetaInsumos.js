import { RecetaInsumoRepository } from '#db/repositories.js'
import { resUpdateFalse, resDeleteFalse } from '#http/helpers.js'

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        qry.fltr.empresa = { op: 'Es', val: empresa }

        const data = await RecetaInsumoRepository.find(qry, true)

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const create = async (req, res) => {
    try {
        const { colaborador, empresa } = req.user
        const { articulo_principal, articulo, cantidad, orden } = req.body

        // --- CREAR --- //
        const nuevo = await RecetaInsumoRepository.create({
            articulo_principal,
            articulo,
            cantidad,
            orden,
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
        const { colaborador } = req.user
        const { id } = req.params
        const { articulo_principal, articulo, cantidad, orden } = req.body

        // --- ACTUALIZAR --- //
        const updated = await RecetaInsumoRepository.update(
            { id },
            {
                cantidad,
                orden,
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

        // --- ELIMINAR --- //
        if ((await RecetaInsumoRepository.delete({ id })) == false) return resDeleteFalse(res)

        res.json({ code: 0 })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

// --- Funciones --- //
async function loadOne(id) {
    const data = await RecetaInsumoRepository.find({ id, incl: ['articulo1'] })

    return data
}

export default {
    find,
    create,
    delet,
    update,
}
