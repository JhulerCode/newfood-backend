import sequelize from '#db/sequelize.js'

import { Repository } from '#db/Repository.js'
import { arrayMap } from '#store/system.js'
import { minioPutObject, minioRemoveObject } from "#infrastructure/minioClient.js"
import { resUpdateFalse, resDeleteFalse } from '#http/helpers.js'

const repository = new Repository('Articulo')
const comboRepository = new Repository('ComboArticulo')

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        qry.fltr.empresa = { op: 'Es', val: empresa }

        let data = await repository.find(qry, true)

        if (data.length > 0) {
            const activo_estadosMap = arrayMap('activo_estados')
            const igv_afectacionesMap = arrayMap('igv_afectaciones')
            const estadosMap = arrayMap('estados')

            for (const a of data) {
                if (qry?.cols?.includes('activo')) a.activo1 = activo_estadosMap[a.activo]
                if (qry?.cols?.includes('igv_afectacion')) a.igv_afectacion1 = igv_afectacionesMap[a.igv_afectacion]
                if (qry?.cols?.includes('has_receta')) a.has_receta1 = estadosMap[a.has_receta]
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
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        const data = await repository.find({ id, ...qry })

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const create = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador, empresa } = req.user
        const {
            codigo_barra, nombre, unidad, marca, activo,
            tipo, categoria,
            produccion_area, has_receta, is_combo, combo_articulos,
            igv_afectacion, precio_venta,
        } = req.body

        // --- VERIFY SI EXISTE NOMBRE --- //
        if (await repository.existe({ nombre, empresa }, res) == true) {
            await transaction.rollback()
            return
        }

        // --- VERIFY SI EXISTE CODIGO DE BARRAS --- //
        if (codigo_barra) {
            if (await repository.existe({ codigo_barra, empresa }, res, 'El código de barras ya existe') == true) {
                await transaction.rollback()
                return
            }
        }

        // --- CREAR --- //
        const nuevo = await repository.create({
            codigo_barra, nombre, unidad, marca, activo,
            tipo, categoria,
            produccion_area, has_receta, is_combo, combo_articulos,
            igv_afectacion, precio_venta,
            empresa,
            createdBy: colaborador
        }, transaction)

        // --- COMBO ITEMS --- //
        if (is_combo == true) {
            const komboItems = combo_articulos.map(a => ({
                articulo_principal: nuevo.id,
                articulo: a.articulo,
                cantidad: a.cantidad,
                orden: a.orden,
                empresa,
                createdBy: colaborador
            }))

            await comboRepository.createBulk(komboItems, transaction)
        }

        await transaction.commit()

        const data = await loadOne(nuevo.id)

        res.json({ code: 0, data })
    }
    catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const update = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador, empresa } = req.user
        const { id } = req.params
        const {
            codigo_barra, nombre, unidad, marca, activo,
            tipo, categoria,
            produccion_area, has_receta, is_combo, combo_articulos,
            igv_afectacion, precio_venta,
            precios_semana,
        } = req.body

        // --- VERIFY SI EXISTE NOMBRE --- //
        if (await repository.existe({ nombre, id, empresa }, res) == true) {
            await transaction.rollback()
            return
        }

        // --- VERIFY SI EXISTE CODIGO DE BARRAS --- //
        if (codigo_barra) {
            if (await repository.existe({ codigo_barra, id, empresa }, res, 'El código de barras ya existe') == true) {
                await transaction.rollback()
                return
            }
        }

        // ----- ACTUALIZAR ----- //
        const updated = await repository.update(
            { id },
            {
                codigo_barra, nombre, unidad, marca, activo,
                tipo, categoria,
                produccion_area, has_receta, is_combo, combo_articulos,
                igv_afectacion, precio_venta,
                precios_semana,
                updatedBy: colaborador
            },
            transaction
        )

        if (updated == false) return resUpdateFalse(res)

        if (is_combo == true) {
            await comboRepository.delete({ articulo_principal: id }, transaction)

            const komboItems = combo_articulos.map(a => ({
                articulo_principal: id,
                articulo: a.articulo,
                cantidad: a.cantidad,
                orden: a.orden,
                empresa: empresa.id,
                createdBy: colaborador
            }))

            await comboRepository.createBulk(komboItems, transaction)
        }

        await transaction.commit()

        const data = await loadOne(id)

        res.json({ code: 0, data })
    }
    catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const delet = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { id } = req.params
        const { is_combo, fotos } = req.body

        // --- ELIMINAR --- //
        if (is_combo == true) {
            await comboRepository.delete({ articulo_principal: id }, transaction)
        }

        if (await repository.delete({ id }, transaction) == false) return resDeleteFalse(res)

        await transaction.commit()

        if (fotos && fotos.length > 0) {
            for (const a of fotos) await minioRemoveObject(a.id)
        }

        res.json({ code: 0 })
    }
    catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const createBulk = async (req, res) => {
    try {
        const { colaborador, empresa } = req.user
        const { tipo, articulos } = req.body

        const send = articulos.map(a => ({
            nombre: a.nombre,
            unidad: tipo == 2 ? 'NIU' : a.unidad,

            tipo,
            categoria: a.categoria,

            produccion_area: a.produccion_area,
            has_receta: a.has_receta,
            is_combo: a.is_combo,

            igv_afectacion: a.Tributo,
            precio_venta: a.precio_venta,
            empresa,
            createdBy: colaborador
        }))

        await repository.createBulk(send)

        res.json({ code: 0 })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const deleteBulk = async (req, res) => {
    try {
        const { ids } = req.body

        if (await repository.delete(ids) == false) return resDeleteFalse(res)

        res.json({ code: 0 })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const updateBulk = async (req, res) => {
    try {
        const { colaborador } = req.user
        const { ids, prop, val } = req.body

        //--- ACTUALIZAR ---//
        const updated = await repository.update({ id: ids }, {
            [prop]: val,
            updatedBy: colaborador
        })

        if (updated == false) return resUpdateFalse(res)

        res.json({ code: 0 })
    }
    catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}


//--- Helpers ---//
async function loadOne(id) {
    const data = await repository.find({ id, incl: ['categoria1', 'produccion_area1'] }, true)

    if (data) {
        const activo_estadosMap = arrayMap('activo_estados')
        const igv_afectacionesMap = arrayMap('igv_afectaciones')
        const estadosMap = arrayMap('estados')

        data.activo1 = activo_estadosMap[data.activo]
        data.igv_afectacion1 = igv_afectacionesMap[data.igv_afectacion]
        data.has_receta1 = estadosMap[data.has_receta]
    }

    return data
}

export default {
    find,
    findById,
    create,
    delet,
    update,

    createBulk,
    deleteBulk,
    updateBulk,
}