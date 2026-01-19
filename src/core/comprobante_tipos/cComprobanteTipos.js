import { Repository } from '#db/Repository.js'
import { arrayMap } from '#store/system.js'

const repository = new Repository('ComprobanteTipo')

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        qry.fltr.empresa = { op: 'Es', val: empresa }

        let data = await repository.find(qry, true)

        if (data.length > 0) {
            const estadosMap = arrayMap('estados')
            const activo_estadosMap = arrayMap('activo_estados')

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

        const data = await repository.find({ id })

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
            nombre, serie, numero, correlativo, activo, estandar
        } = req.body

        //--- VERIFY SI EXISTE SERIE ---//

        //--- VERIFY SI NO FUE UTILIZADO ---//

        // --- ACTUALIZAR --- //
        const updated = await repository.update({ id }, {
            nombre, serie, numero, correlativo, activo, estandar,
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


// --- Funciones --- //
async function loadOne(id) {
    const data = await ComprobanteTipo.findByPk({ id }, true)

    if (data) {
        const activo_estadosMap = arrayMap('activo_estados')
        const estadosMap = arrayMap('estados')

        data.activo1 = activo_estadosMap[data.activo]
        data.estandar1 = estadosMap[data.estandar]
    }

    return data
}

export default {
    find,
    findById,
    update,
}