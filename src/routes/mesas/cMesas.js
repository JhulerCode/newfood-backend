import sequelize from '../../database/sequelize.js'
import { Op } from 'sequelize'
import { Mesa } from '../../database/models/Mesa.js'
import { applyFilters } from '../../utils/mine.js'
import cSistema from "../_sistema/cSistema.js"
import { Transaccion, TransaccionItem } from '../../database/models/Transaccion.js'

const create = async (req, res) => {
    try {
        const { colaborador } = req.user
        const {
            nombre, activo, salon,
        } = req.body

       // --- ACTUALIZAR --- //
        const nuevo = await Mesa.create(
            {
                nombre, activo, salon,
                createdBy: colaborador
            }
        )

        const data = await loadOne(nuevo.id)
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
            nombre, activo, salon,
        } = req.body

        console.log(id)
        console.log(nombre)
        console.log(activo)
        console.log(salon)

       // --- ACTUALIZAR --- //
        const [affectedRows] = await Mesa.update(
            {
                nombre, activo, salon,
                updatedBy: colaborador
            },
            {
                where: { id },
            }
        )

        if (affectedRows > 0) {
           // --- DEVOLVER --- //
            const data = await loadOne(id)
            res.json({ code: 0, data })
        }
        else {
            res.json({ code: 1, msg: 'No se actualizó ningún registro' })
        }
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

async function loadOne(id) {
    let data = await Mesa.findByPk(id)

    if (data) {
        data = data.toJSON()

        const activo_estadosMap = cSistema.arrayMap('activo_estados')
        data.activo1 = activo_estadosMap[data.activo]
    }

    return data
}

const find = async (req, res) => {
    try {
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        const findProps = {
            attributes: ['id'],
            order: [['nombre', 'ASC']],
            where: {}
        }

        if (qry) {
            if (qry.fltr) {
                Object.assign(findProps.where, applyFilters(qry.fltr))
            }

            if (qry.cols) {
                findProps.attributes = findProps.attributes.concat(qry.cols)
            }
        }

        let data = await Mesa.findAll(findProps)

        if (data.length > 0) {
            data = data.map(a => a.toJSON())

            const activo_estadosMap = cSistema.arrayMap('activo_estados')

            for (const a of data) {
                if (qry.cols.includes('activo')) a.activo1 = activo_estadosMap[a.activo]
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

        const data = await Mesa.findByPk(id)

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
        const deletedCount = await Mesa.destroy({ where: { id } })

        const send = deletedCount > 0 ? { code: 0 } : { code: 1, msg: 'No se eliminó ningún registro' }

        res.json(send)
    }
    catch (error) {
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
            }
            else {
                principal = a
            }
        }

        await Mesa.update({
            unida: false,
            unidos,
            updatedBy: colaborador
        }, {
            where: { id: principal.id },
            transaction
        })

        await Mesa.update({
            unida: true,
            unidos: [],
            updatedBy: colaborador
        }, {
            where: {
                id: { [Op.in]: unidosId }
            },
            transaction
        })

        const pedidos = await Transaccion.findAll({
            where: {
                venta_mesa: {
                    [Op.in]: mesasUnir.map(a => a.id)
                },
                estado: '1'
            }
        })

        if (pedidos.length > 0) {
            const pedidosId = pedidos.map(a => a.id)

            // --- DEFINIR PEDIDO PRINCIPAL --- //
            const i = pedidos.findIndex(a => a.venta_mesa == principal.id)
            const pedidoId = i !== -1 ? pedidos[i].id : pedidos[0].id

            // --- ACTUALIZAR ITEMS --- //
            await TransaccionItem.update({
                transaccion: pedidoId,
                updatedBy: colaborador
            }, {
                where: {
                    transaccion: { [Op.in]: pedidosId }
                },
                transaction
            })

            // --- ELIMINAR LOS OTROS PEDIDOS --- //
            const pedidosSecundarios = pedidosId.filter(a => a != pedidoId)
            await Transaccion.destroy({
                where: {
                    id: { [Op.in]: pedidosSecundarios }
                },
                transaction
            })

            // --- ACTUALIZAR MESA EN PEDIDO PRINCIPAL --- //
            await Transaccion.update({
                venta_mesa: principal.id,
                updatedBy: colaborador
            }, {
                where: {
                    id: pedidoId
                },
                transaction
            })
        }

        await transaction.commit()

        res.json({ code: 0 })
    }
    catch (error) {
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
                await Mesa.update(
                    {
                        unida: false,
                        updatedBy: colaborador
                    },
                    {
                        where: { id: a.id },
                        transaction
                    }
                )
            }

            await Mesa.update(
                {
                    unidos: [],
                    updatedBy: colaborador
                },
                {
                    where: { id },
                    transaction
                }
            )

            await transaction.commit()

            res.json({ code: 0 })
        }
        catch (error) {
            await transaction.rollback()
            throw error
        }
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
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