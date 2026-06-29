import sequelize from '#db/sequelize.js'
import {
    PagoMetodoRepository,
    SucursalRepository,
    SucursalPagoMetodoRepository,
} from '#db/repositories.js'
import { arrayMap } from '#store/system.js'

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        qry.fltr.empresa = { op: 'Es', val: empresa }

        let data = await PagoMetodoRepository.find(qry, true)

        if (data.length > 0) {
            const activo_estadosMap = arrayMap('activo_estados')

            for (const a of data) {
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

        const data = await PagoMetodoRepository.find({ id })

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const create = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador, empresa } = req.user
        const { nombre, color, activo } = req.body

        // --- VERIFY SI EXISTE NOMBRE --- //
        if ((await PagoMetodoRepository.existe({ nombre, empresa }, res)) == true) return

        // --- CREAR --- //
        const nuevo = await PagoMetodoRepository.create(
            {
                nombre,
                color,
                activo,

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
                pago_metodo: nuevo.id,
                empresa,
                createdBy: colaborador,
            })
        }
        await SucursalPagoMetodoRepository.createBulk(sucursales, transaction)

        await transaction.commit()

        const data = await loadOne(nuevo.id)

        res.json({ code: 0, data })
    } catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const update = async (req, res) => {
    try {
        const { colaborador, empresa } = req.user
        const { id } = req.params
        const { nombre, color, activo } = req.body

        // --- VERIFY SI EXISTE NOMBRE --- //
        if ((await PagoMetodoRepository.existe({ nombre, id, empresa }, res)) == true) return

        // --- ACTUALIZAR --- //
        const updated = await PagoMetodoRepository.update(
            { id },
            {
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
    const transaction = await sequelize.transaction()

    try {
        const { id } = req.params

        await SucursalPagoMetodoRepository.delete({ pago_metodo: id }, transaction)

        if ((await PagoMetodoRepository.delete({ id }, transaction)) == false)
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

        const pago_metodos = await PagoMetodoRepository.find(qry, true)
        const sucursales = await SucursalRepository.find(qry, true)
        const sucursal_pago_metodos_actuales = await SucursalPagoMetodoRepository.find(
            {
                fltr: { empresa: { op: 'Es', val: empresa } },
                cols: ['sucursal', 'pago_metodo'],
            },
            true,
        )

        const sucursal_pago_metodos_map = new Set(
            sucursal_pago_metodos_actuales.map((a) => `${a.sucursal}:${a.pago_metodo}`),
        )
        const sucursal_pago_metodos = []

        for (const pago_metodo of pago_metodos) {
            for (const sucursal of sucursales) {
                const relation_key = `${sucursal.id}:${pago_metodo.id}`

                if (sucursal_pago_metodos_map.has(relation_key)) continue

                sucursal_pago_metodos.push({
                    sucursal: sucursal.id,
                    pago_metodo: pago_metodo.id,
                    estado: true,
                    empresa,
                    createdBy: colaborador,
                })
            }
        }

        if (sucursal_pago_metodos.length > 0) {
            await SucursalPagoMetodoRepository.createBulk(sucursal_pago_metodos, transaction)
        }

        await transaction.commit()

        res.json({
            code: 0,
            data: {
                created: sucursal_pago_metodos.length,
                pago_metodos: pago_metodos.length,
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
    const data = await PagoMetodoRepository.find({ id }, true)

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
    syncSucursales,
}
