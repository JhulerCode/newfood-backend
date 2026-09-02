import {
    ArticuloRepository,
    ArticuloVariantRepository,
    SucursalArticuloRepository,
    SucursalArticuloVariantRepository,
} from '#db/repositories.js'
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

export function buildBranchVariantRows(variants, sucursales, empresa, colaborador) {
    const rows = []

    for (const variant of variants) {
        for (const sucursal of sucursales || []) {
            rows.push({
                sucursal: sucursal.id,
                articulo: variant.articulo,
                articulo_variant: variant.id,
                estado: true,
                empresa,
                createdBy: colaborador,
            })
        }
    }

    return rows
}
