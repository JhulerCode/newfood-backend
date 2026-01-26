import { SucursalArticuloRepository } from '#db/repositories.js'
import { arrayMap } from '#store/system.js'
import { resUpdateFalse } from '#http/helpers.js'

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        qry.fltr.empresa = { op: 'Es', val: empresa }

        let data = await SucursalArticuloRepository.find(qry, true)

        if (data.length > 0) {
            const activo_estadosMap = arrayMap('activo_estados')

            for (const a of data) {
                if (qry?.cols?.includes('estado')) a.estado1 = activo_estadosMap[a.activo]
            }
        }

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const update = async (req, res) => {
    try {
        const { colaborador, empresa } = req.user
        const { id } = req.params
        const { estado } = req.body

        // --- ACTUALIZAR --- //
        const updated = await SucursalArticuloRepository.update(
            { id },
            { estado, updatedBy: colaborador },
        )

        if (updated == false) return resUpdateFalse(res)

        res.json({ code: 0 })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

export default {
    find,
    update,
}
