import sequelize from '#db/sequelize.js'
import { ComprobanteTipoRepository, SucursalComprobanteTipoRepository } from '#db/repositories.js'
import { arrayMap } from '#store/system.js'

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        qry.fltr.empresa = { op: 'Es', val: empresa }

        let data = await ComprobanteTipoRepository.find(qry, true)

        if (data.length > 0) {
            const comprobante_tiposMap = arrayMap('comprobante_tipos')
            const estadosMap = arrayMap('estados')
            const activo_estadosMap = arrayMap('activo_estados')

            for (const a of data) {
                if (qry?.cols?.includes('tipo')) a.tipo1 = comprobante_tiposMap[a.tipo]
                if (qry?.cols?.includes('activo')) a.activo1 = activo_estadosMap[a.activo]
                if (qry?.cols?.includes('estandar')) a.estandar1 = estadosMap[a.estandar]
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

        const data = await ComprobanteTipoRepository.find({ id })

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const create = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador, empresa } = req.user
        const { tipo, serie, numero, activo, estandar } = req.body

        // --- VERIFY SI EXISTE --- //
        if ((await ComprobanteTipoRepository.existe({ tipo, serie, empresa }, res)) == true) return

        // --- CREAR --- //
        const nuevo = await ComprobanteTipoRepository.create(
            {
                tipo,
                serie,
                numero,
                correlativo: numero,
                activo,
                estandar,

                empresa,
                createdBy: colaborador,
            },
            transaction,
        )

        // --- CREAR SUCURSAL COMPROBANTE TIPOS --- //
        const sucursales = []
        for (const b of req.empresa.sucursales) {
            sucursales.push({
                sucursal: b.id,
                comprobante_tipo: nuevo.id,
                empresa,
                createdBy: colaborador,
            })
        }
        await SucursalComprobanteTipoRepository.createBulk(sucursales, transaction)

        await transaction.commit()

        const data = await loadOne(nuevo.id)

        res.json({ code: 0, data })
    } catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const delet = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { id } = req.params

        await SucursalComprobanteTipoRepository.delete({ comprobante_tipo: id }, transaction)

        if ((await ComprobanteTipoRepository.delete({ id }, transaction)) == false)
            return resDeleteFalse(res)

        await transaction.commit()

        res.json({ code: 0 })
    } catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

// --- Funciones --- //
async function loadOne(id) {
    const data = await ComprobanteTipoRepository.find({ id }, true)

    if (data) {
        const comprobante_tiposMap = arrayMap('comprobante_tipos')
        const activo_estadosMap = arrayMap('activo_estados')
        const estadosMap = arrayMap('estados')

        data.tipo1 = comprobante_tiposMap[data.tipo]
        data.activo1 = activo_estadosMap[data.activo]
        data.estandar1 = estadosMap[data.estandar]
    }

    return data
}

export default {
    find,
    findById,
    create,
    delet,
}
