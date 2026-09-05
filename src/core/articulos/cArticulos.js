import sequelize from '#db/sequelize.js'
import { Op } from 'sequelize'

import {
    ArticuloRepository,
    ArticuloVariantRepository,
    ArticuloCategoriaRepository,
    ComboArticuloRepository,
    RecetaInsumoRepository,
    ImpresionAreaRepository,
    TransaccionItemRepository,
    KardexRepository,
    ComprobanteItemRepository,
    SucursalRepository,
    SucursalArticuloRepository,
    SucursalArticuloVariantRepository,
} from '#db/repositories.js'
import { buildBranchVariantRows, normalizeMovementItems } from './sArticuloVariants.js'
import { arrayMap } from '#store/system.js'
import { minioPutObject, minioRemoveObject } from '#infrastructure/minioClient.js'
import { resUpdateFalse, resDeleteFalse } from '#http/helpers.js'
import { getSqlAttribute } from '#db/Repository.js'

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : {}

        qry.fltr ||= {}
        qry.fltr.empresa = { op: 'Es', val: empresa }

        if (qry.incl?.includes('articulo_variants') && Array.isArray(qry.cols)) {
            if (!qry.cols.includes('has_variants')) qry.cols.push('has_variants')
        }

        let data = await ArticuloRepository.find(qry, true)

        if (data.length > 0) {
            const activo_estadosMap = arrayMap('activo_estados')
            const igv_afectacionesMap = arrayMap('igv_afectaciones')
            const estadosMap = arrayMap('estados')

            for (const a of data) {
                if (qry?.cols?.includes('activo')) a.activo1 = activo_estadosMap[a.activo]
                if (qry?.cols?.includes('igv_afectacion'))
                    a.igv_afectacion1 = igv_afectacionesMap[a.igv_afectacion]
                if (qry?.cols?.includes('has_receta')) a.has_receta1 = estadosMap[a.has_receta]
                if (qry?.cols?.includes('has_variants'))
                    a.has_variants1 = estadosMap[a.has_variants]

                if (qry?.incl?.includes('articulo_variants')) {
                    a.articulo_variants = sortVariants(a.articulo_variants, a.id)
                    a.variants_count = a.has_variants ? a.articulo_variants.length : 0
                    a.variants_summary = a.has_variants
                        ? a.articulo_variants
                              .map((variant) => variant.nombre)
                              .filter(Boolean)
                              .join(', ')
                        : 'Sin variantes'
                }

                if (qry?.incl?.includes('sucursal_articulos')) {
                    a.sucursal1 = a.sucursal_articulos[0]
                }
            }
        }

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const findById = async (req, res) => {
    try {
        const { empresa } = req.user
        const { id } = req.params
        const data = await loadOne(id, empresa)

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const findVariants = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : {}
        const sucursal = qry.sucursal || req.sucursal.id
        const stockAttribute = getSqlAttribute('articulo_variant_stock', {
            sequelize,
            sucursal,
            tableAlias: 'articulo_variants',
        })
        const stockValuationAttribute = getSqlAttribute(
            'articulo_variant_stock_valorizado',
            {
                sequelize,
                sucursal,
                tableAlias: 'articulo_variants',
            },
        )
        const articleWhere = { empresa }
        const variantWhere = { empresa }

        if (qry.include_inactive != true) {
            articleWhere.activo = true
            variantWhere.activo = true
        }

        if (qry.articulo) variantWhere.articulo = qry.articulo

        if (qry.tipo !== undefined && qry.tipo !== null && qry.tipo !== '') {
            articleWhere.tipo = qry.tipo
        }
        if (qry.has_receta !== undefined) articleWhere.has_receta = qry.has_receta
        if (qry.is_combo !== undefined) articleWhere.is_combo = qry.is_combo

        if (qry.barcode) {
            variantWhere.codigo_barras = cleanText(qry.barcode)
        } else if (qry.search) {
            const search = `%${cleanText(qry.search)}%`
            variantWhere[Op.or] = [
                { nombre: { [Op.iLike]: search } },
                { sku: { [Op.iLike]: search } },
                { codigo_barras: { [Op.iLike]: search } },
                { '$articulo1.nombre$': { [Op.iLike]: search } },
            ]
        }

        const variants = await ArticuloVariantRepository.model.findAll({
            where: variantWhere,
            attributes: [
                'id',
                'articulo',
                'nombre',
                'sku',
                'codigo_barras',
                'price',
                'activo',
                stockAttribute,
                stockValuationAttribute,
            ],
            include: [
                {
                    model: ArticuloRepository.model,
                    as: 'articulo1',
                    where: articleWhere,
                    required: true,
                    attributes: [
                        'id',
                        'nombre',
                        'activo',
                        'unidad',
                        'precio_venta',
                        'variants_different_prices',
                        'precios_semana',
                        'igv_afectacion',
                        'has_receta',
                        'is_combo',
                        'categoria',
                        'has_variants',
                    ],
                    include: [
                        {
                            model: ArticuloCategoriaRepository.model,
                            as: 'categoria1',
                            attributes: ['id', 'nombre'],
                            required: false,
                        },
                        {
                            model: SucursalArticuloRepository.model,
                            as: 'sucursal_articulos',
                            where: {
                                sucursal,
                                empresa,
                                ...(qry.include_disabled_branch == true ? {} : { estado: true }),
                            },
                            attributes: ['id', 'estado', 'impresion_area'],
                            required: true,
                            include: [
                                {
                                    model: ImpresionAreaRepository.model,
                                    as: 'impresion_area1',
                                    attributes: [
                                        'id',
                                        'nombre',
                                        'impresora_tipo',
                                        'impresora',
                                        'impresora_display_name',
                                    ],
                                    required: false,
                                },
                            ],
                        },
                        ...(qry.include_components == false
                            ? []
                            : [
                                  {
                                      model: ComboArticuloRepository.model,
                                      as: 'combo_articulos',
                                      separate: true,
                                      attributes: [
                                          'id',
                                          'articulo_principal',
                                          'articulo',
                                          'articulo_variant',
                                          'cantidad',
                                          'orden',
                                      ],
                                      required: false,
                                      include: [
                                          {
                                              model: ArticuloRepository.model,
                                              as: 'articulo1',
                                              attributes: [
                                                  'id',
                                                  'nombre',
                                                  'unidad',
                                                  'has_receta',
                                              ],
                                              required: false,
                                          },
                                          {
                                              model: ArticuloVariantRepository.model,
                                              as: 'articulo_variant1',
                                              attributes: [
                                                  'id',
                                                  'articulo',
                                                  'nombre',
                                                  'sku',
                                                  'codigo_barras',
                                              ],
                                              required: false,
                                          },
                                      ],
                                  },
                              ]),
                    ],
                },
                {
                    model: SucursalArticuloVariantRepository.model,
                    as: 'sucursal_articulo_variants',
                    where: {
                        sucursal,
                        empresa,
                        ...(qry.include_disabled_branch == true ? {} : { estado: true }),
                    },
                    attributes: ['id', 'estado'],
                    required: true,
                },
                ...(qry.include_components == false
                    ? []
                    : [
                          {
                              model: RecetaInsumoRepository.model,
                              as: 'receta_insumos',
                              separate: true,
                              attributes: [
                                  'id',
                                  'articulo_principal',
                                  'articulo_principal_variant',
                                  'articulo',
                                  'articulo_variant',
                                  'cantidad',
                                  'orden',
                              ],
                              required: false,
                              include: [
                                  {
                                      model: ArticuloRepository.model,
                                      as: 'articulo1',
                                      attributes: ['id', 'nombre', 'unidad'],
                                      required: false,
                                  },
                                  {
                                      model: ArticuloVariantRepository.model,
                                      as: 'articulo_variant1',
                                      attributes: ['id', 'articulo', 'nombre'],
                                      required: false,
                                  },
                              ],
                          },
                      ]),
            ],
            order: [
                [{ model: ArticuloRepository.model, as: 'articulo1' }, 'nombre', 'ASC'],
                ['nombre', 'ASC'],
            ],
            limit: Number(qry.limit) > 0 ? Math.min(Number(qry.limit), 2000) : 50,
            subQuery: false,
        })

        const igvAfectacionesMap = arrayMap('igv_afectaciones')
        const estadosMap = arrayMap('estados')
        const data = variants.map((model) => {
            const variant = model.toJSON()
            const article = variant.articulo1
            const branchVariant = variant.sucursal_articulo_variants[0]
            const branchArticle = article.sucursal_articulos[0]
            const price = article.variants_different_prices
                ? variant.price
                : article.precio_venta
            const baseName = variant.nombre
                ? `${article.nombre} / ${variant.nombre}`
                : article.nombre
            const available =
                article.activo == true &&
                variant.activo == true &&
                branchArticle.estado == true &&
                branchVariant.estado == true

            return {
                id: variant.id,
                articulo: variant.articulo,
                articulo_variant: variant.id,
                nombre: `${baseName}${available ? '' : ' [INACTIVA]'}`,
                articulo_nombre: article.nombre,
                variant_nombre: variant.nombre,
                variant_price: variant.price,
                articulo_variant_stock: variant.articulo_variant_stock,
                articulo_variant_stock_valorizado:
                    variant.articulo_variant_stock_valorizado,
                activo: variant.activo,
                disponible: available,
                sku: variant.sku,
                codigo_barras: variant.codigo_barras,
                codigo_barra: variant.codigo_barras,
                unidad: article.unidad,
                precio_venta: price,
                precios_semana: article.precios_semana,
                igv_afectacion: article.igv_afectacion,
                igv_afectacion1: igvAfectacionesMap[article.igv_afectacion],
                has_receta: article.has_receta,
                has_receta1: estadosMap[article.has_receta],
                has_variants: article.has_variants,
                is_combo: article.is_combo,
                categoria: article.categoria,
                categoria1: article.categoria1,
                sucursal1: branchArticle,
                receta_insumos: variant.receta_insumos || [],
                combo_articulos: article.combo_articulos || [],
            }
        })

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const create = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        parseBody(req)

        const { colaborador, empresa } = req.user
        const {
            codigo_barra: codigoBarraInput,
            nombre,
            unidad,
            marca,
            activo,
            tipo,
            categoria,
            produccion_area,
            has_receta,
            is_combo,
            has_variants = false,
            variants_different_prices = false,
            articulo_variants = [],
            combo_articulos,
            igv_afectacion,
            precio_venta,
        } = req.body
        const hasVariants = has_variants === true
        const variantsDifferentPrices =
            hasVariants && tipo == 2 && variants_different_prices === true
        const precioVenta = variantsDifferentPrices ? null : precio_venta
        const codigo_barra = getArticleBarcode(codigoBarraInput, hasVariants, articulo_variants)

        if (tipo == 2 && !variantsDifferentPrices && !isValidPrice(precioVenta)) {
            await transaction.rollback()
            res.json({ code: 1, msg: 'Ingrese un precio de venta válido' })
            return
        }

        // --- VERIFY SI EXISTE NOMBRE --- //
        if ((await ArticuloRepository.existe({ nombre, empresa }, res)) == true) {
            await transaction.rollback()
            return
        }

        // --- VERIFY SI EXISTE CODIGO DE BARRAS --- //
        if (codigo_barra) {
            if (
                (await ArticuloRepository.existe(
                    { codigo_barra, empresa },
                    res,
                    'El código de barras ya existe',
                )) == true
            ) {
                await transaction.rollback()
                return
            }
        }

        // --- CREAR --- //
        const nuevo = await ArticuloRepository.create(
            {
                codigo_barra,
                nombre,
                unidad,
                marca,
                activo,
                tipo,
                categoria,
                produccion_area,
                has_receta,
                is_combo,
                has_variants: hasVariants,
                variants_different_prices: variantsDifferentPrices,
                combo_articulos,
                igv_afectacion,
                precio_venta: precioVenta,
                empresa,
                createdBy: colaborador,
            },
            transaction,
        )

        const variants = buildVariants({
            articulo: nuevo,
            hasVariants,
            differentPrices: variantsDifferentPrices,
            input: articulo_variants,
            empresa,
            colaborador,
        })

        if (
            (await validateVariants(
                variants,
                hasVariants,
                variantsDifferentPrices,
                empresa,
                res,
                transaction,
            )) == false
        ) {
            await transaction.rollback()
            return
        }

        await ArticuloVariantRepository.createBulk(variants, transaction)

        const branchVariants = buildBranchVariantRows(
            variants,
            req.empresa.sucursales,
            empresa,
            colaborador,
        )
        if (branchVariants.length > 0) {
            await SucursalArticuloVariantRepository.createBulk(branchVariants, transaction)
        }

        // --- COMBO ITEMS --- //
        if (is_combo == true) {
            const normalizedComboItems = await normalizeComboItems(
                combo_articulos,
                empresa,
                transaction,
            )
            const komboItems = normalizedComboItems.map((a) => ({
                articulo_principal: nuevo.id,
                articulo: a.articulo,
                articulo_variant: a.articulo_variant,
                cantidad: a.cantidad,
                orden: a.orden,
                empresa,
                createdBy: colaborador,
            }))

            await ComboArticuloRepository.createBulk(komboItems, transaction)
        }

        // --- CREAR SUCURSAL ARTICULOS --- //
        const sucursal_articulos = []
        for (const b of req.empresa.sucursales) {
            sucursal_articulos.push({
                sucursal: b.id,
                articulo: nuevo.id,
                empresa,
                createdBy: colaborador,
            })
        }

        await SucursalArticuloRepository.createBulk(sucursal_articulos, transaction)

        await transaction.commit()

        const data = await loadOne(nuevo.id, empresa)

        res.json({ code: 0, data })
    } catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const update = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        parseBody(req)

        const { colaborador, empresa } = req.user
        const { id } = req.params
        const {
            codigo_barra: codigoBarraInput,
            nombre,
            unidad,
            marca,
            activo,
            tipo,
            categoria,
            produccion_area,
            has_receta,
            is_combo,
            has_variants = false,
            variants_different_prices = false,
            articulo_variants = [],
            combo_articulos,
            igv_afectacion,
            precio_venta,
            precios_semana,
        } = req.body
        const hasVariants = has_variants === true
        const variantsDifferentPrices =
            hasVariants && tipo == 2 && variants_different_prices === true
        const precioVenta = variantsDifferentPrices ? null : precio_venta
        const codigo_barra = getArticleBarcode(
            codigoBarraInput,
            hasVariants,
            articulo_variants,
            id,
        )

        if (tipo == 2 && !variantsDifferentPrices && !isValidPrice(precioVenta)) {
            await transaction.rollback()
            res.json({ code: 1, msg: 'Ingrese un precio de venta válido' })
            return
        }

        // --- VERIFY SI EXISTE NOMBRE --- //
        if ((await ArticuloRepository.existe({ nombre, id, empresa }, res)) == true) {
            await transaction.rollback()
            return
        }

        // --- VERIFY SI EXISTE CODIGO DE BARRAS --- //
        if (codigo_barra) {
            if (
                (await ArticuloRepository.existe(
                    { codigo_barra, id, empresa },
                    res,
                    'El código de barras ya existe',
                )) == true
            ) {
                await transaction.rollback()
                return
            }
        }

        // ----- ACTUALIZAR ----- //
        const updated = await ArticuloRepository.update(
            { id, empresa },
            {
                codigo_barra,
                nombre,
                unidad,
                marca,
                activo,
                tipo,
                categoria,
                produccion_area,
                has_receta,
                is_combo,
                has_variants: hasVariants,
                variants_different_prices: variantsDifferentPrices,
                combo_articulos,
                igv_afectacion,
                precio_venta: precioVenta,
                precios_semana,
                updatedBy: colaborador,
            },
            transaction,
        )

        if (updated == false) {
            await transaction.rollback()
            return resUpdateFalse(res)
        }

        const existingVariants = (
            await ArticuloVariantRepository.model.findAll({
                where: { articulo: id, empresa },
                transaction,
            })
        ).map((variant) => variant.toJSON())
        const articulo = {
            id,
            codigo_barra,
            precio_venta: precioVenta,
            activo,
        }

        if (
            hasVariants &&
            existingVariants.some((variant) => variant.id == id) &&
            (!Array.isArray(articulo_variants) ||
                !articulo_variants.some((variant) => variant.id == id))
        ) {
            await transaction.rollback()
            res.json({ code: 1, msg: 'La variante original no se puede eliminar' })
            return
        }

        const variants = buildVariants({
            articulo,
            hasVariants,
            differentPrices: variantsDifferentPrices,
            input: articulo_variants,
            existing: existingVariants,
            empresa,
            colaborador,
        })

        if (
            (await validateVariants(
                variants,
                hasVariants,
                variantsDifferentPrices,
                empresa,
                res,
                transaction,
                existingVariants.map((variant) => variant.id),
            )) == false
        ) {
            await transaction.rollback()
            return
        }

        if (
            (await validateRemovedVariants(
                id,
                variants,
                existingVariants,
                res,
                transaction,
            )) == false
        ) {
            await transaction.rollback()
            return
        }

        await syncVariants(
            id,
            variants,
            existingVariants,
            colaborador,
            empresa,
            req.empresa.sucursales,
            transaction,
        )

        // El artículo ya fue actualizado con { id, empresa }, validando su pertenencia.
        // Versiones anteriores guardaban empresa.id y dejaban componentes sin empresa.
        await ComboArticuloRepository.delete(
            { articulo_principal: id, [Op.or]: [{ empresa }, { empresa: null }] },
            transaction,
        )

        if (is_combo == true) {
            const normalizedComboItems = await normalizeComboItems(
                combo_articulos,
                empresa,
                transaction,
            )
            const komboItems = normalizedComboItems.map((a) => ({
                articulo_principal: id,
                articulo: a.articulo,
                articulo_variant: a.articulo_variant,
                cantidad: a.cantidad,
                orden: a.orden,
                empresa,
                createdBy: colaborador,
            }))

            await ComboArticuloRepository.createBulk(komboItems, transaction)
        }

        await transaction.commit()

        const data = await loadOne(id, empresa)

        res.json({ code: 0, data })
    } catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const delet = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { empresa } = req.user
        const { id } = req.params
        const { fotos } = req.body

        // --- ELIMINAR --- //
        await ComboArticuloRepository.delete({ articulo_principal: id, empresa }, transaction)
        await RecetaInsumoRepository.delete({ articulo_principal: id, empresa }, transaction)

        await SucursalArticuloRepository.delete({ articulo: id, empresa }, transaction)
        await SucursalArticuloVariantRepository.delete({ articulo: id, empresa }, transaction)
        await ArticuloVariantRepository.delete({ articulo: id, empresa }, transaction)

        if ((await ArticuloRepository.delete({ id, empresa }, transaction)) == false) {
            await transaction.rollback()
            return resDeleteFalse(res)
        }

        await transaction.commit()

        if (fotos && fotos.length > 0) {
            for (const a of fotos) await minioRemoveObject(a.id)
        }

        res.json({ code: 0 })
    } catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const createBulk = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador, empresa } = req.user
        const { tipo, articulos } = req.body

        // --- CREAR ARTICULOS --- //
        const send = articulos.map((a) => ({
            id: crypto.randomUUID(),
            nombre: a.nombre,
            unidad: tipo == 2 ? 'NIU' : a.unidad,

            tipo,
            categoria: a.categoria,

            // produccion_area: a.produccion_area,
            has_receta: a.has_receta,
            is_combo: a.is_combo,
            has_variants: false,

            igv_afectacion: a.igv_afectacion,
            precio_venta: a.precio_venta,

            empresa,
            createdBy: colaborador,
        }))

        await ArticuloRepository.createBulk(send, transaction)

        const articulo_variants = send.map((articulo) =>
            shapeDefaultVariant(articulo, empresa, colaborador),
        )

        await ArticuloVariantRepository.createBulk(articulo_variants, transaction)

        const branchVariants = buildBranchVariantRows(
            articulo_variants,
            req.empresa.sucursales,
            empresa,
            colaborador,
        )
        if (branchVariants.length > 0) {
            await SucursalArticuloVariantRepository.createBulk(branchVariants, transaction)
        }

        // --- CREAR SUCURSAL ARTICULOS --- //
        const sucursal_articulos = []
        for (const a of send) {
            for (const b of req.empresa.sucursales) {
                sucursal_articulos.push({
                    sucursal: b.id,
                    articulo: a.id,
                    empresa,
                    createdBy: colaborador,
                })
            }
        }

        await SucursalArticuloRepository.createBulk(sucursal_articulos, transaction)

        await transaction.commit()

        res.json({ code: 0 })
    } catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const deleteBulk = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { empresa } = req.user
        const { ids } = req.body

        await ComboArticuloRepository.delete({ articulo_principal: ids, empresa }, transaction)
        await RecetaInsumoRepository.delete({ articulo_principal: ids, empresa }, transaction)

        await SucursalArticuloRepository.delete({ articulo: ids, empresa }, transaction)
        await SucursalArticuloVariantRepository.delete({ articulo: ids, empresa }, transaction)
        await ArticuloVariantRepository.delete({ articulo: ids, empresa }, transaction)

        if ((await ArticuloRepository.delete({ id: ids, empresa }, transaction)) == false) {
            await transaction.rollback()
            return resDeleteFalse(res)
        }

        await transaction.commit()

        res.json({ code: 0 })
    } catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const updateBulk = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador, empresa } = req.user
        const { ids, prop, val } = req.body

        //--- ACTUALIZAR ---//
        const updated = await ArticuloRepository.update(
            { id: ids, empresa },
            {
                [prop]: val,
                updatedBy: colaborador,
            },
            transaction,
        )

        if (updated == false) {
            await transaction.rollback()
            return resUpdateFalse(res)
        }

        const variantPropMap = { codigo_barra: 'codigo_barras' }
        const variantProp = variantPropMap[prop]

        if (variantProp) {
            await ArticuloVariantRepository.update(
                { id: ids, empresa },
                { [variantProp]: val, updatedBy: colaborador },
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

const syncSucursales = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador, empresa } = req.user
        const { tipo, is_combo } = req.body

        const fltr = { empresa: { op: 'Es', val: empresa } }

        if (tipo !== undefined && tipo !== null && tipo !== '') {
            fltr.tipo = { op: 'Es', val: tipo }
        }

        if (is_combo !== undefined && is_combo !== null) {
            fltr.is_combo = { op: 'Es', val: is_combo }
        }

        const articulos = await ArticuloRepository.find({ fltr, cols: ['id'] }, true)
        const sucursales = await SucursalRepository.find(
            {
                fltr: { empresa: { op: 'Es', val: empresa } },
                cols: ['id'],
            },
            true,
        )
        const sucursal_articulos_actuales = await SucursalArticuloRepository.find(
            {
                fltr: { empresa: { op: 'Es', val: empresa } },
                cols: ['sucursal', 'articulo'],
            },
            true,
        )
        const articulo_variants = await ArticuloVariantRepository.find(
            {
                fltr: { empresa: { op: 'Es', val: empresa } },
                cols: ['articulo'],
            },
            true,
        )
        const sucursal_variants_actuales = await SucursalArticuloVariantRepository.find(
            {
                fltr: { empresa: { op: 'Es', val: empresa } },
                cols: ['sucursal', 'articulo', 'articulo_variant'],
            },
            true,
        )

        const sucursal_articulos_map = new Set(
            sucursal_articulos_actuales.map((a) => `${a.sucursal}:${a.articulo}`),
        )
        const sucursal_articulos = []
        const sucursal_variants_map = new Set(
            sucursal_variants_actuales.map((row) => `${row.sucursal}:${row.articulo_variant}`),
        )
        const sucursal_variants = []

        for (const articulo of articulos) {
            for (const sucursal of sucursales) {
                const relation_key = `${sucursal.id}:${articulo.id}`

                if (sucursal_articulos_map.has(relation_key)) continue

                sucursal_articulos.push({
                    sucursal: sucursal.id,
                    articulo: articulo.id,
                    estado: true,
                    empresa,
                    createdBy: colaborador,
                })
            }
        }

        for (const variant of articulo_variants) {
            for (const sucursal of sucursales) {
                const relationKey = `${sucursal.id}:${variant.id}`
                if (sucursal_variants_map.has(relationKey)) continue

                sucursal_variants.push({
                    sucursal: sucursal.id,
                    articulo: variant.articulo,
                    articulo_variant: variant.id,
                    estado: true,
                    empresa,
                    createdBy: colaborador,
                })
            }
        }

        if (sucursal_articulos.length > 0) {
            await SucursalArticuloRepository.createBulk(sucursal_articulos, transaction)
        }
        if (sucursal_variants.length > 0) {
            await SucursalArticuloVariantRepository.createBulk(sucursal_variants, transaction)
        }

        await transaction.commit()

        res.json({
            code: 0,
            data: {
                created: sucursal_articulos.length,
                variants_created: sucursal_variants.length,
                articulos: articulos.length,
                sucursales: sucursales.length,
            },
        })
    } catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

//--- Helpers ---//
function shapeDefaultVariant(articulo, empresa, colaborador) {
    return {
        id: articulo.id,
        articulo: articulo.id,
        nombre: null,
        sku: null,
        codigo_barras: articulo.codigo_barra || null,
        price: null,
        activo: articulo.activo ?? true,
        empresa,
        createdBy: colaborador,
    }
}

function buildVariants({
    articulo,
    hasVariants,
    differentPrices = false,
    input,
    existing = [],
    empresa,
    colaborador,
}) {
    if (hasVariants != true) {
        return [shapeDefaultVariant(articulo, empresa, colaborador)]
    }

    const existingIds = new Set(existing.map((variant) => variant.id))
    const variants = Array.isArray(input) ? input : []

    return variants.map((variant, index) => {
        let id

        if (variant.id == articulo.id || (!existingIds.has(articulo.id) && index == 0)) {
            id = articulo.id
        } else if (existingIds.has(variant.id) && variant.id != articulo.id) {
            id = variant.id
        } else {
            id = crypto.randomUUID()
        }

        return {
            id,
            articulo: articulo.id,
            nombre: cleanText(variant.nombre),
            sku: cleanText(variant.sku),
            codigo_barras: cleanText(variant.codigo_barras),
            price: differentPrices ? normalizeVariantPrice(variant.price) : null,
            activo: variant.activo ?? true,
            empresa,
            createdBy: existingIds.has(id) ? undefined : colaborador,
            updatedBy: existingIds.has(id) ? colaborador : undefined,
        }
    })
}

async function validateVariants(
    variants,
    hasVariants,
    differentPrices,
    empresa,
    res,
    transaction,
    excludedIds = [],
) {
    if (variants.length == 0) {
        res.json({ code: 1, msg: 'Debe registrar al menos una variante' })
        return false
    }

    if (new Set(variants.map((variant) => variant.id)).size != variants.length) {
        res.json({ code: 1, msg: 'No se puede repetir una variante' })
        return false
    }

    if (hasVariants == true && variants.some((variant) => !variant.nombre)) {
        res.json({ code: 1, msg: 'Todas las variantes deben tener un nombre' })
        return false
    }

    if (
        hasVariants == true &&
        differentPrices == true &&
        variants.some((variant) => variant.price === null)
    ) {
        res.json({ code: 1, msg: 'Ingrese el precio de todas las variantes' })
        return false
    }

    if (
        variants.some(
            (variant) =>
                variant.price !== null &&
                (!Number.isFinite(Number(variant.price)) || Number(variant.price) < 0),
        )
    ) {
        res.json({ code: 1, msg: 'Ingrese un precio válido para las variantes' })
        return false
    }

    for (const [field, label] of [
        ['nombre', 'nombre'],
        ['sku', 'SKU'],
        ['codigo_barras', 'código de barras'],
    ]) {
        const values = variants
            .map((variant) => variant[field]?.toString().trim().toLocaleLowerCase())
            .filter(Boolean)

        if (new Set(values).size != values.length) {
            res.json({ code: 1, msg: `No se puede repetir el ${label} de una variante` })
            return false
        }
    }

    const ids = [...new Set([...variants.map((variant) => variant.id), ...excludedIds])]

    for (const [field, label] of [
        ['sku', 'SKU'],
        ['codigo_barras', 'código de barras'],
    ]) {
        const values = variants.map((variant) => variant[field]).filter(Boolean)
        if (values.length == 0) continue

        const duplicate = await ArticuloVariantRepository.model.findOne({
            where: {
                empresa,
                [field]: { [Op.in]: values },
                id: { [Op.notIn]: ids },
            },
            attributes: ['id'],
            transaction,
        })

        if (duplicate) {
            res.json({ code: 1, msg: `El ${label} de la variante ya existe` })
            return false
        }
    }

    return true
}

async function syncVariants(
    articulo,
    variants,
    existing,
    colaborador,
    empresa,
    sucursales,
    transaction,
) {
    const variantsMap = new Map(variants.map((variant) => [variant.id, variant]))
    const existingMap = new Map(existing.map((variant) => [variant.id, variant]))
    const removedIds = existing
        .filter((variant) => !variantsMap.has(variant.id) && variant.id != articulo)
        .map((variant) => variant.id)

    if (removedIds.length > 0) {
        await SucursalArticuloVariantRepository.delete(
            { articulo_variant: removedIds, empresa },
            transaction,
        )
        await ArticuloVariantRepository.delete({ id: removedIds }, transaction)
    }

    if (existing.length > 0) {
        await ArticuloVariantRepository.model.update(
            { sku: null, codigo_barras: null },
            { where: { articulo, empresa }, transaction },
        )
    }

    for (const variant of variants) {
        if (existingMap.has(variant.id)) {
            const { id, articulo: articuloId, empresa: variantEmpresa, createdBy, ...data } = variant
            await ArticuloVariantRepository.update(
                { id, articulo: articuloId, empresa: variantEmpresa },
                { ...data, updatedBy: colaborador },
                transaction,
            )
        } else {
            await ArticuloVariantRepository.create(
                { ...variant, createdBy: colaborador, updatedBy: null },
                transaction,
            )
        }
    }

    const newVariants = variants.filter((variant) => !existingMap.has(variant.id))
    const branchVariants = buildBranchVariantRows(
        newVariants,
        sucursales,
        empresa,
        colaborador,
    )
    if (branchVariants.length > 0) {
        await SucursalArticuloVariantRepository.createBulk(branchVariants, transaction)
    }
}

async function validateRemovedVariants(articulo, variants, existing, res, transaction) {
    const retainedIds = new Set(variants.map((variant) => variant.id))
    const removedIds = existing
        .filter((variant) => variant.id != articulo && !retainedIds.has(variant.id))
        .map((variant) => variant.id)

    if (removedIds.length == 0) return true

    const references = await Promise.all(
        [
            TransaccionItemRepository,
            KardexRepository,
            ComprobanteItemRepository,
            ComboArticuloRepository,
        ].map((repository) =>
            repository.model.count({
                where: { articulo_variant: { [Op.in]: removedIds } },
                transaction,
            }),
        ),
    )

    const recipeReferences = await RecetaInsumoRepository.model.count({
        where: {
            [Op.or]: [
                { articulo_principal_variant: { [Op.in]: removedIds } },
                { articulo_variant: { [Op.in]: removedIds } },
            ],
        },
        transaction,
    })

    if (references.some((count) => count > 0) || recipeReferences > 0) {
        res.json({
            code: 1,
            msg: 'No se puede eliminar una variante utilizada en movimientos, combos o recetas. Desactívela para conservar las referencias.',
        })
        return false
    }

    return true
}

function cleanText(value) {
    const text = value?.toString().trim()
    return text || null
}

function normalizeVariantPrice(value) {
    if (value === null || value === undefined || value === '') return null
    return Number(value)
}

function isValidPrice(value) {
    return (
        value !== null &&
        value !== undefined &&
        value !== '' &&
        Number.isFinite(Number(value)) &&
        Number(value) >= 0
    )
}

function getArticleBarcode(currentBarcode, hasVariants, variants, articleId) {
    if (hasVariants != true || !Array.isArray(variants)) return cleanText(currentBarcode)

    const defaultVariant =
        variants.find((variant) => variant.id == articleId || variant.is_default == true) ||
        variants[0]

    return cleanText(defaultVariant?.codigo_barras)
}

function sortVariants(variants, articleId) {
    return variants
        .map((variant) => ({ ...variant, is_default: variant.id == articleId }))
        .sort((a, b) => {
            if (a.is_default != b.is_default) return Number(b.is_default) - Number(a.is_default)
            return (a.nombre || '').localeCompare(b.nombre || '', 'es')
        })
}

function parseBody(req) {
    if (typeof req.body?.datos != 'string') return

    const data = JSON.parse(req.body.datos)
    Object.assign(req.body, data)
    delete req.body.datos
}

async function loadOne(id, empresa) {
    const data = await ArticuloRepository.find(
        {
            id,
            fltr: { empresa: { op: 'Es', val: empresa } },
            incl: [
                'categoria1',
                'produccion_area1',
                'articulo_variants',
                'combo_articulos',
            ],
            iccl: {
                combo_articulos: {
                    incl: ['articulo1', 'articulo_variant1'],
                },
            },
        },
        true,
    )

    if (data) {
        const activo_estadosMap = arrayMap('activo_estados')
        const igv_afectacionesMap = arrayMap('igv_afectaciones')
        const estadosMap = arrayMap('estados')

        data.activo1 = activo_estadosMap[data.activo]
        data.igv_afectacion1 = igv_afectacionesMap[data.igv_afectacion]
        data.has_receta1 = estadosMap[data.has_receta]
        data.has_variants1 = estadosMap[data.has_variants]
        data.articulo_variants = sortVariants(data.articulo_variants, id)
        data.variants_count = data.has_variants ? data.articulo_variants.length : 0
        data.variants_summary = data.has_variants
            ? data.articulo_variants
                  .map((variant) => variant.nombre)
                  .filter(Boolean)
                  .join(', ')
            : 'Sin variantes'
    }

    return data
}

async function normalizeComboItems(items, empresa, transaction) {
    if (!Array.isArray(items) || items.length == 0) {
        throw new Error('Agregue al menos un componente al combo')
    }

    for (const item of items) {
        if (!item.articulo || !item.articulo_variant) {
            throw new Error('Cada componente del combo debe tener una variante seleccionada')
        }
        if (!Number.isFinite(Number(item.cantidad)) || Number(item.cantidad) <= 0) {
            throw new Error('La cantidad de cada componente debe ser mayor a cero')
        }
    }

    const normalized = await normalizeMovementItems(items, empresa, transaction)
    const variantIds = new Set()
    for (const item of normalized) {
        if (variantIds.has(item.articulo_variant)) {
            throw new Error('Una variante no puede repetirse dentro del mismo combo')
        }
        variantIds.add(item.articulo_variant)
    }

    return normalized
}

export default {
    find,
    findById,
    findVariants,
    create,
    delet,
    update,

    createBulk,
    deleteBulk,
    updateBulk,
    syncSucursales,
}
