import sequelize from '#db/sequelize.js'
import {
    ArticuloRepository,
    SucursalArticuloRepository,
    SucursalArticuloVariantRepository,
} from '#db/repositories.js'
import { arrayMap } from '#store/system.js'
import { resUpdateFalse } from '#http/helpers.js'

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        qry.fltr.empresa = { op: 'Es', val: empresa }

        let data = await SucursalArticuloRepository.find(qry, true)

        if (data.length > 0) {
            const activo_estadosMap = arrayMap('activo_estados')

            for (const a of data) {
                if (qry?.cols?.includes('estado')) a.estado1 = activo_estadosMap[a.estado]
            }
        }

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const update = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador, empresa } = req.user
        const { id } = req.params
        const { estado, impresion_area } = req.body

        const sucursalArticulo = await SucursalArticuloRepository.model.findOne({
            where: { id, empresa },
            attributes: ['id', 'sucursal', 'articulo'],
            transaction,
        })

        if (!sucursalArticulo) {
            await transaction.rollback()
            return resUpdateFalse(res)
        }

        const articulo = await ArticuloRepository.model.findOne({
            where: { id: sucursalArticulo.articulo, empresa },
            attributes: ['id', 'has_variants'],
            transaction,
        })

        if (!articulo) throw new Error('No se encontró el artículo relacionado')

        // --- ACTUALIZAR --- //
        const updated = await SucursalArticuloRepository.update(
            { id, empresa },
            { estado, impresion_area, updatedBy: colaborador },
            transaction,
        )

        if (updated == false) {
            await transaction.rollback()
            return resUpdateFalse(res)
        }

        if (estado !== undefined && articulo.has_variants !== true) {
            const [variantsUpdated] = await SucursalArticuloVariantRepository.model.update(
                { estado, updatedBy: colaborador },
                {
                    where: {
                        sucursal: sucursalArticulo.sucursal,
                        articulo: sucursalArticulo.articulo,
                        empresa,
                    },
                    transaction,
                },
            )

            if (variantsUpdated == 0) {
                throw new Error('No se encontró la variante técnica del artículo en la sucursal')
            }
        }

        await transaction.commit()

        res.json({ code: 0 })
    } catch (error) {
        if (!transaction.finished) await transaction.rollback()
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const updateBulk = async (req, res) => {
    try {
        const { colaborador, empresa } = req.user
        const { ids, prop, val } = req.body

        // --- ACTUALIZAR --- //
        const updated = await SucursalArticuloRepository.update(
            { id: ids, empresa },
            {
                [prop]: val,
                updatedBy: colaborador,
            },
        )

        if (updated == false) return resUpdateFalse(res)

        res.json({ code: 0 })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

export default {
    find,
    update,
    updateBulk,
}
