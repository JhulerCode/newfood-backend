import sequelize from '#db/sequelize.js'
import { ComboArticulo } from '#db/models/ComboArticulo.js'
import { normalizeMovementItems } from '#core/articulos/sArticuloVariants.js'

const createBulk = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador, empresa } = req.user
        const { articulos } = req.body

        if (!Array.isArray(articulos) || articulos.length == 0) {
            throw new Error('No hay componentes para importar')
        }
        for (const item of articulos) {
            if (!item.articulo_principal || !item.articulo || !item.articulo_variant) {
                throw new Error('Cada componente debe tener artículo y variante')
            }
            if (!Number.isFinite(Number(item.cantidad)) || Number(item.cantidad) <= 0) {
                throw new Error('La cantidad de cada componente debe ser mayor a cero')
            }
        }

        const normalized = await normalizeMovementItems(articulos, empresa, transaction)
        const send = normalized.map(a => ({
            articulo_principal: a.articulo_principal,
            articulo: a.articulo,
            articulo_variant: a.articulo_variant,
            cantidad: a.cantidad,

            empresa,
            createdBy: colaborador
        }))

        await ComboArticulo.bulkCreate(send, { transaction })
        await transaction.commit()

        res.json({ code: 0 })
    }
    catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

export default {
    createBulk,
}
