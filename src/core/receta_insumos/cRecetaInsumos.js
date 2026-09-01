import sequelize from '#db/sequelize.js'
import { ArticuloRepository, RecetaInsumoRepository } from '#db/repositories.js'
import { normalizeMovementItems } from '#core/articulos/sArticuloVariants.js'
import { resUpdateFalse, resDeleteFalse } from '#http/helpers.js'

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : {}

        qry.fltr ||= {}
        qry.fltr.empresa = { op: 'Es', val: empresa }

        const data = await RecetaInsumoRepository.find(qry, true)
        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const create = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador, empresa } = req.user
        const {
            articulo_principal,
            articulo_principal_variant,
            articulo,
            articulo_variant,
            cantidad,
            orden,
        } = req.body

        validateQuantity(cantidad)

        const [principal, componente] = await normalizeMovementItems(
            [
                { articulo: articulo_principal, articulo_variant: articulo_principal_variant },
                { articulo, articulo_variant },
            ],
            empresa,
            transaction,
        )

        const [articuloPrincipal, articuloComponente] = await Promise.all([
            ArticuloRepository.model.findOne({
                where: { id: principal.articulo, empresa, has_receta: true },
                attributes: ['id'],
                transaction,
            }),
            ArticuloRepository.model.findOne({
                where: { id: componente.articulo, empresa, tipo: '1' },
                attributes: ['id'],
                transaction,
            }),
        ])
        if (!articuloPrincipal) throw new Error('El producto principal no admite receta')
        if (!articuloComponente) throw new Error('El componente debe ser un insumo')

        if (principal.articulo_variant == componente.articulo_variant) {
            throw new Error('Una variante no puede ser componente de su propia receta')
        }

        const duplicate = await RecetaInsumoRepository.model.findOne({
            where: {
                articulo_principal_variant: principal.articulo_variant,
                articulo_variant: componente.articulo_variant,
                empresa,
            },
            attributes: ['id'],
            transaction,
        })
        if (duplicate) throw new Error('La variante ya está agregada a esta receta')

        const nuevo = await RecetaInsumoRepository.create(
            {
                articulo_principal: principal.articulo,
                articulo_principal_variant: principal.articulo_variant,
                articulo: componente.articulo,
                articulo_variant: componente.articulo_variant,
                cantidad,
                orden,
                empresa,
                createdBy: colaborador,
            },
            transaction,
        )

        await transaction.commit()

        const data = await loadOne(nuevo.id, empresa)
        res.json({ code: 0, data })
    } catch (error) {
        if (!transaction.finished) await transaction.rollback()
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const update = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador, empresa } = req.user
        const { id } = req.params
        const { cantidad, orden } = req.body

        validateQuantity(cantidad)

        const updated = await RecetaInsumoRepository.update(
            { id, empresa },
            { cantidad, orden, updatedBy: colaborador },
            transaction,
        )

        if (updated == false) {
            await transaction.rollback()
            return resUpdateFalse(res)
        }

        await transaction.commit()

        const data = await loadOne(id, empresa)
        res.json({ code: 0, data })
    } catch (error) {
        if (!transaction.finished) await transaction.rollback()
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const delet = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { empresa } = req.user
        const { id } = req.params

        if ((await RecetaInsumoRepository.delete({ id, empresa }, transaction)) == false) {
            await transaction.rollback()
            return resDeleteFalse(res)
        }

        await transaction.commit()
        res.json({ code: 0 })
    } catch (error) {
        if (!transaction.finished) await transaction.rollback()
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

function validateQuantity(cantidad) {
    if (!Number.isFinite(Number(cantidad)) || Number(cantidad) <= 0) {
        throw new Error('La cantidad del componente debe ser mayor a cero')
    }
}

async function loadOne(id, empresa) {
    return RecetaInsumoRepository.find(
        {
            id,
            fltr: { empresa: { op: 'Es', val: empresa } },
            incl: ['articulo1', 'articulo_variant1'],
        },
        true,
    )
}

export default {
    find,
    create,
    delet,
    update,
}
