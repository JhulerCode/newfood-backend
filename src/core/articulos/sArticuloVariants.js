import sequelize from '#db/sequelize.js'
import {
    ArticuloRepository,
    ArticuloVariantRepository,
    SucursalArticuloRepository,
    SucursalArticuloVariantRepository,
} from '#db/repositories.js'
import { arrayMap } from '#store/system.js'
import { Op } from 'sequelize'

export async function normalizeMovementItems(
    items,
    empresa,
    transaction,
    { sucursal, requireAvailable = false } = {},
) {
    if (!Array.isArray(items) || items.length == 0) return []

    const variantIds = [
        ...new Set(items.map((item) => item.articulo_variant || item.articulo).filter(Boolean)),
    ]
    const variants = await ArticuloVariantRepository.model.findAll({
        where: { id: { [Op.in]: variantIds }, empresa },
        include: [
            {
                model: ArticuloRepository.model,
                as: 'articulo1',
                attributes: ['id', 'activo'],
                required: true,
            },
        ],
        transaction,
    })
    const variantsMap = new Map(variants.map((variant) => [variant.id, variant.toJSON()]))

    let branchArticlesMap = new Map()
    let branchVariantsMap = new Map()

    if (requireAvailable) {
        if (!sucursal) throw new Error('No se indicó la sucursal para validar las variantes')

        const articleIds = [...new Set(items.map((item) => item.articulo).filter(Boolean))]
        const [branchArticles, branchVariants] = await Promise.all([
            SucursalArticuloRepository.model.findAll({
                where: { sucursal, articulo: { [Op.in]: articleIds }, empresa },
                attributes: ['articulo', 'estado'],
                transaction,
            }),
            SucursalArticuloVariantRepository.model.findAll({
                where: { sucursal, articulo_variant: { [Op.in]: variantIds }, empresa },
                attributes: ['articulo_variant', 'estado'],
                transaction,
            }),
        ])

        branchArticlesMap = new Map(
            branchArticles.map((row) => [row.articulo, row.toJSON().estado]),
        )
        branchVariantsMap = new Map(
            branchVariants.map((row) => [row.articulo_variant, row.toJSON().estado]),
        )
    }

    return items.map((item) => {
        const variantId = item.articulo_variant || item.articulo
        const variant = variantsMap.get(variantId)

        if (!variant || variant.articulo != item.articulo) {
            throw new Error(`La variante seleccionada no pertenece al artículo ${item.articulo}`)
        }

        if (
            requireAvailable &&
            (variant.activo != true ||
                variant.articulo1?.activo != true ||
                branchArticlesMap.get(item.articulo) != true ||
                branchVariantsMap.get(variantId) != true)
        ) {
            throw new Error('El artículo o la variante no está disponible en esta sucursal')
        }

        return { ...item, articulo_variant: variantId }
    })
}

export async function updateVariantStock(
    sucursal,
    items,
    tipo,
    transaction,
    { empresa, factor = 1 } = {},
) {
    if (!Array.isArray(items) || items.length == 0) return

    const operation = arrayMap('kardex_operaciones')[tipo]?.operacion
    if (!operation) throw new Error('Tipo de operación de kardex no válido')

    const variants = new Map()
    const articles = new Map()

    for (const item of items) {
        const amount = Number(item.cantidad) * operation * factor
        if (!Number.isFinite(amount)) throw new Error('Cantidad de movimiento no válida')

        const variantId = item.articulo_variant || item.articulo
        variants.set(variantId, (variants.get(variantId) || 0) + amount)
        articles.set(item.articulo, (articles.get(item.articulo) || 0) + amount)
    }

    for (const [articuloVariant, amount] of variants) {
        const [affectedRows] = await SucursalArticuloVariantRepository.model.update(
            { stock: sequelize.literal(`COALESCE(stock, 0) + ${amount}`) },
            {
                where: {
                    sucursal,
                    articulo_variant: articuloVariant,
                    ...(empresa ? { empresa } : {}),
                },
                transaction,
            },
        )

        if (affectedRows == 0) {
            throw new Error('La variante no está configurada para la sucursal seleccionada')
        }
    }

    // Compatibilidad temporal: conserva el total agregado usado por las pantallas antiguas.
    for (const [articulo, amount] of articles) {
        const updated = await SucursalArticuloRepository.update(
            { sucursal, articulo, ...(empresa ? { empresa } : {}) },
            { stock: sequelize.literal(`COALESCE(stock, 0) + ${amount}`) },
            transaction,
        )

        if (updated == false) {
            throw new Error('El artículo no está configurado para la sucursal seleccionada')
        }
    }
}

export function buildBranchVariantRows(variants, sucursales, empresa, colaborador) {
    const rows = []

    for (const variant of variants) {
        for (const sucursal of sucursales || []) {
            rows.push({
                sucursal: sucursal.id,
                articulo: variant.articulo,
                articulo_variant: variant.id,
                estado: true,
                stock: 0,
                empresa,
                createdBy: colaborador,
            })
        }
    }

    return rows
}
