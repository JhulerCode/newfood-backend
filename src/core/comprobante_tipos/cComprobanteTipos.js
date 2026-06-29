import sequelize from '#db/sequelize.js'
import {
    ComprobanteTipoRepository,
    SucursalRepository,
    SucursalComprobanteTipoRepository,
} from '#db/repositories.js'
import { arrayMap } from '#store/system.js'
import { resDeleteFalse } from '#http/helpers.js'

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

const syncSucursales = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador, empresa } = req.user

        const qry = {
            fltr: { empresa: { op: 'Es', val: empresa } },
            cols: ['id'],
        }

        const comprobante_tipos = await ComprobanteTipoRepository.find(qry, true)
        const sucursales = await SucursalRepository.find(qry, true)
        const sucursal_comprobante_tipos_actuales =
            await SucursalComprobanteTipoRepository.find(
                {
                    fltr: { empresa: { op: 'Es', val: empresa } },
                    cols: ['sucursal', 'comprobante_tipo'],
                },
                true,
            )

        const sucursal_comprobante_tipos_map = new Set(
            sucursal_comprobante_tipos_actuales.map(
                (a) => `${a.sucursal}:${a.comprobante_tipo}`,
            ),
        )
        const sucursal_comprobante_tipos = []

        for (const comprobante_tipo of comprobante_tipos) {
            for (const sucursal of sucursales) {
                const relation_key = `${sucursal.id}:${comprobante_tipo.id}`

                if (sucursal_comprobante_tipos_map.has(relation_key)) continue

                sucursal_comprobante_tipos.push({
                    sucursal: sucursal.id,
                    comprobante_tipo: comprobante_tipo.id,
                    estado: true,
                    empresa,
                    createdBy: colaborador,
                })
            }
        }

        if (sucursal_comprobante_tipos.length > 0) {
            await SucursalComprobanteTipoRepository.createBulk(
                sucursal_comprobante_tipos,
                transaction,
            )
        }

        await transaction.commit()

        res.json({
            code: 0,
            data: {
                created: sucursal_comprobante_tipos.length,
                comprobante_tipos: comprobante_tipos.length,
                sucursales: sucursales.length,
            },
        })
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
    syncSucursales,
}
