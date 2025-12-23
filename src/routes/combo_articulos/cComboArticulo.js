import sequelize from '../../database/sequelize.js'
import { ComboArticulo } from '../../database/models/ComboArticulo.js'

const createBulk = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador, empresa } = req.user
        const { articulos } = req.body

        const send = articulos.map(a => ({
            articulo_principal: a.articulo_principal,
            articulo: a.articulo,
            cantidad: a.cantidad,

            empresa: empresa.id,
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