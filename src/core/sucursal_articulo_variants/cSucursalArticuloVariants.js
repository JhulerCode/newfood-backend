import { SucursalArticuloVariantRepository } from '#db/repositories.js'
import { arrayMap } from '#store/system.js'
import { resUpdateFalse } from '#http/helpers.js'

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : {}
        qry.fltr ||= {}
        qry.fltr.empresa = { op: 'Es', val: empresa }

        const data = await SucursalArticuloVariantRepository.find(qry, true)
        if (qry?.cols?.includes('estado')) {
            const estadosMap = arrayMap('activo_estados')
            for (const row of data) row.estado1 = estadosMap[row.estado]
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
        const updated = await SucursalArticuloVariantRepository.update(
            { id, empresa },
            { estado, updatedBy: colaborador },
        )

        if (updated == false) return resUpdateFalse(res)
        res.json({ code: 0 })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

export default { find, update }
