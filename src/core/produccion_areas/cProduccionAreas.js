import { ImpresionAreaRepository } from '#db/repositories.js'
import { arrayMap } from '#store/system.js'

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        qry.fltr.empresa = { op: 'Es', val: empresa }

        let data = await ImpresionAreaRepository.find(qry, true)

        if (data.length > 0) {
            const activo_estadosMap = arrayMap('activo_estados')
            const impresora_tiposMap = arrayMap('impresora_tipos')

            for (const a of data) {
                if (qry?.cols?.includes('activo')) a.activo1 = activo_estadosMap[a.activo]
                if (qry?.cols?.includes('impresora_tipo'))
                    a.impresora_tipo1 = impresora_tiposMap[a.impresora_tipo]
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

        const data = await ImpresionAreaRepository.find({ id })

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const create = async (req, res) => {
    try {
        const { colaborador, empresa } = req.user
        const { nombre, impresora_tipo, impresora, activo, sucursal } = req.body

        // --- VERIFY SI EXISTE NOMBRE --- //
        if ((await ImpresionAreaRepository.existe({ nombre, sucursal, empresa }, res)) == true)
            return

        // --- CREAR --- //
        const nuevo = await ImpresionAreaRepository.create({
            nombre,
            impresora_tipo,
            impresora,
            activo,
            sucursal,
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
        const { nombre, impresora_tipo, impresora, activo, sucursal } = req.body

        // --- VERIFY SI EXISTE NOMBRE --- //
        if ((await ImpresionAreaRepository.existe({ nombre, sucursal, empresa, id }, res)) == true)
            return

        // --- ACTUALIZAR --- //
        const updated = await ImpresionAreaRepository.update(
            { id },
            {
                nombre,
                impresora_tipo,
                impresora,
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

        // --- ACTUALIZAR --- //
        if ((await ImpresionAreaRepository.delete({ id })) == false) return resDeleteFalse(res)

        res.json({ code: 0 })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

// --- Funciones --- //
async function loadOne(id) {
    const data = await ImpresionAreaRepository.find({ id, incl: ['sucursal1'] }, true)

    if (data) {
        const activo_estadosMap = arrayMap('activo_estados')
        const impresora_tiposMap = arrayMap('impresora_tipos')

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
