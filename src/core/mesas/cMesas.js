import {
    MesaRepository,
    TransaccionRepository,
    TransaccionItemRepository,
} from '#db/repositories.js'
import { arrayMap } from '#store/system.js'
import sequelize from '#db/sequelize.js'

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        qry.fltr.empresa = { op: 'Es', val: empresa }

        let data = await MesaRepository.find(qry, true)

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

        const data = await MesaRepository.find({ id })

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const create = async (req, res) => {
    try {
        const { colaborador, empresa } = req.user
        const { nombre, activo, salon } = req.body

        // --- VERIFY SI EXISTE NOMBRE --- //
        if ((await MesaRepository.existe({ nombre, salon, empresa }, res)) == true) return

        // --- CREAR --- //
        const nuevo = await MesaRepository.create({
            nombre,
            activo,
            salon,
            empresa: empresa.id,
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
        const { nombre, activo, salon } = req.body

        // --- VERIFY SI EXISTE NOMBRE --- //
        if ((await MesaRepository.existe({ nombre, salon, id, empresa }, res)) == true) return

        // --- ACTUALIZAR --- //
        const updated = await MesaRepository.update(
            { id },
            {
                nombre,
                activo,
                salon,
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
        if ((await MesaRepository.delete({ id })) == false) return resDeleteFalse(res)

        res.json({ code: 0 })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const unir = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador } = req.user
        const mesasUnir = req.body

        const unidos = []
        const unidosId = []
        let principal

        for (const a of mesasUnir) {
            if (a.unidos && a.unidos.length > 0) {
                for (const b of a.unidos) {
                    unidos.push(b)
                    unidosId.push(b.id)
                }
            }

            if (a.principal != true) {
                unidos.push(a)
                unidosId.push(a.id)
            } else {
                principal = a
            }
        }

        await MesaRepository.update(
            { id: principal.id },
            {
                unida: false,
                unidos,
                updatedBy: colaborador,
            },
            transaction,
        )

        await MesaRepository.update(
            { id: unidosId },
            {
                unida: true,
                unidos: [],
                updatedBy: colaborador,
            },
            transaction,
        )

        const qry = {
            fltr: {
                venta_mesa: { op: 'Es', val: mesasUnir.map((a) => a.id) },
                estado: { op: 'Es', val: '1' },
            },
        }
        const pedidos = await TransaccionRepository.find(qry)

        if (pedidos.length > 0) {
            const pedidosId = pedidos.map((a) => a.id)

            // --- DEFINIR PEDIDO PRINCIPAL --- //
            const i = pedidos.findIndex((a) => a.venta_mesa == principal.id)
            const pedidoId = i !== -1 ? pedidos[i].id : pedidos[0].id

            // --- ACTUALIZAR ITEMS --- //
            await TransaccionItemRepository.update(
                { transaccion: pedidosId },
                {
                    transaccion: pedidoId,
                    updatedBy: colaborador,
                },
                transaction,
            )

            // --- ELIMINAR LOS OTROS PEDIDOS --- //
            const pedidosSecundarios = pedidosId.filter((a) => a != pedidoId)
            await TransaccionRepository.delete({ id: pedidosSecundarios }, transaction)

            // --- ACTUALIZAR MESA EN PEDIDO PRINCIPAL --- //
            await TransaccionRepository.update(
                { id: pedidoId },
                {
                    venta_mesa: principal.id,
                    updatedBy: colaborador,
                },
                transaction,
            )
        }

        await transaction.commit()

        res.json({ code: 0 })
    } catch (error) {
        await transaction.rollback()
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const desunir = async (req, res) => {
    try {
        const { colaborador } = req.user
        const { id, unidos } = req.body

        const transaction = await sequelize.transaction()

        try {
            for (const a of unidos) {
                await MesaRepository.update(
                    { id: a.id },
                    {
                        unida: false,
                        updatedBy: colaborador,
                    },
                    transaction,
                )
            }

            await MesaRepository.update(
                { id },
                {
                    unidos: [],
                    updatedBy: colaborador,
                },
                transaction,
            )

            await transaction.commit()

            res.json({ code: 0 })
        } catch (error) {
            await transaction.rollback()
            throw error
        }
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

// --- Funciones --- //
async function loadOne(id) {
    const data = await MesaRepository.find({ id }, true)

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

    unir,
    desunir,
}
