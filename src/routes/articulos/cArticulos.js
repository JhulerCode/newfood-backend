import { Op } from 'sequelize'
import sequelize from '../../database/sequelize.js'
import { Articulo } from '../../database/models/Articulo.js'
import { ArticuloCategoria } from '../../database/models/ArticuloCategoria.js'
import { ProduccionArea } from '../../database/models/ProduccionArea.js'
import { RecetaInsumo } from '../../database/models/RecetaInsumo.js'
import { ComboArticulo } from '../../database/models/ComboArticulo.js'
import { existe, applyFilters } from '../../utils/mine.js'
import cSistema from "../_sistema/cSistema.js"
import { deleteFile } from '../../utils/uploadFiles.js'
import { minioClient, minioDomain, minioBucket } from "../../lib/minioClient.js"

const include1 = {
    categoria1: {
        model: ArticuloCategoria,
        as: 'categoria1',
        attributes: ['id', 'nombre']
    },
    produccion_area1: {
        model: ProduccionArea,
        as: 'produccion_area1',
        attributes: ['id', 'impresora_tipo', 'impresora', 'nombre']
    },
    receta_insumos: {
        model: RecetaInsumo,
        as: 'receta_insumos',
        attributes: ['articulo_principal', 'articulo', 'cantidad']
    },
    combo_articulos: {
        model: ComboArticulo,
        as: 'combo_articulos',
        attributes: ['articulo_principal', 'articulo', 'cantidad'],
        include: {
            model: Articulo,
            as: 'articulo1',
            attributes: ['id', 'nombre', 'unidad', 'has_receta'],
            include: {
                model: RecetaInsumo,
                as: 'receta_insumos',
                attributes: ['articulo_principal', 'articulo', 'cantidad']
            }
        }
    }
}

const create = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador, empresa } = req.user

        if (req.body.datos) {
            const datos = JSON.parse(req.body.datos)
            req.body = { ...req.body, ...datos }
        }

        const {
            codigo_barra, nombre, unidad, marca, activo,
            igv_afectacion,
            tipo, categoria,
            produccion_area, has_receta,
            is_combo, combo_articulos,
            precio_venta,
        } = req.body

        // --- VERIFY SI EXISTE NOMBRE --- //
        if (await existe(Articulo, { nombre, empresa: empresa.id }, res) == true) {
            await transaction.rollback()
            return
        }

        // --- VERIFY SI EXISTE CODIGO DE BARRAS --- //
        if (codigo_barra) {
            if (await existe(Articulo, { codigo_barra, empresa: empresa.id }, res) == true) {
                await transaction.rollback()
                return
            }
        }

        // --- CREAR --- //
        const nuevo = await Articulo.create({
            codigo_barra, nombre, unidad, marca, activo,
            igv_afectacion,
            tipo, categoria,
            produccion_area, has_receta,
            is_combo,
            precio_venta,
            foto_path: req.file ? req.file.filename : null,
            empresa: empresa.id,
            createdBy: colaborador
        }, { transaction })

        // --- COMBO ITEMS --- //
        if (is_combo == true) {
            const komboItems = combo_articulos.map(a => ({
                articulo_principal: nuevo.id,
                articulo: a.articulo,
                cantidad: a.cantidad,
                orden: a.orden,
                empresa: empresa.id,
                createdBy: colaborador
            }))

            await ComboArticulo.bulkCreate(komboItems, { transaction })
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

        if (req.body.datos) {
            const datos = JSON.parse(req.body.datos)
            req.body = { ...datos }
        }

        const {
            codigo_barra, nombre, unidad, marca, activo,
            igv_afectacion,
            tipo, categoria,
            produccion_area, has_receta,
            is_combo, combo_articulos,
            precio_venta, precios_semana,
            foto_path, previous_foto_path,
            patch_mode,
        } = req.body

        // --- VERIFY SI EXISTE NOMBRE --- //
        if (await existe(Articulo, { nombre, empresa: empresa.id, id }, res) == true) {
            await transaction.rollback()
            return
        }

        // --- VERIFY SI EXISTE CODIGO DE BARRAS --- //
        // if (codigo_barra) {
        //     if (await existe(Articulo, { codigo_barra, empresa: empresa.id }, res) == true) {
        //         await transaction.rollback()
        //         return
        //     }
        // }

        // --- ACTUALIZAR --- //
        const send = {
            codigo_barra, nombre, unidad, marca, activo,
            igv_afectacion,
            tipo, categoria,
            produccion_area, has_receta,
            is_combo,
            precio_venta, precios_semana,
            foto_path,
            updatedBy: colaborador
        }

        if (req.file) {
            const timestamp = Date.now()
            const uniqueName = `${timestamp}-${req.file.originalname}`

            await minioClient.putObject(
                minioBucket,
                uniqueName,
                req.file.buffer,
                req.file.size,
                { "Content-Type": req.file.mimetype }
            );

            send.foto_path = uniqueName

            if (previous_foto_path && previous_foto_path !== uniqueName) {
                try {
                    await minioClient.removeObject(minioBucket, previous_foto_path)
                } catch (err) {
                    console.error("Error al borrar logo anterior:", err.message)
                }
            }

            const publicUrl = `https://${minioDomain}/${minioBucket}/${uniqueName}`;
            send.foto_url = publicUrl;
        }

        const [affectedRows] = await Articulo.update(
            send,
            {
                where: { id },
                transaction
            }
        )

        if (affectedRows > 0) {
            // --- COMBO ITEMS --- //
            if (is_combo == true) {
                await ComboArticulo.destroy({
                    where: { articulo_principal: id },
                    transaction
                })

                const komboItems = combo_articulos.map(a => ({
                    articulo_principal: id,
                    articulo: a.articulo,
                    cantidad: a.cantidad,
                    orden: a.orden,
                    empresa: empresa.id,
                    createdBy: colaborador
                }))

                await ComboArticulo.bulkCreate(komboItems, { transaction })
            }

            await transaction.commit()

            const data = await loadOne(id)
            res.json({ code: 0, data })
        }
        else {
            await transaction.rollback()

            res.json({ code: 1, msg: 'No se actualizó ningún registro' })
        }
    }
    catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        const findProps = {
            attributes: ['id'],
            order: [['tipo', 'ASC'], ['nombre', 'ASC']],
            where: { empresa: empresa.id },
            include: []
        }

        if (qry) {
            if (qry.fltr) {
                Object.assign(findProps.where, applyFilters(qry.fltr))
            }

            if (qry.cols) {
                findProps.attributes = findProps.attributes.concat(qry.cols)

                // --- AGREAGAR LOS REF QUE SI ESTÁN EN LA BD --- //
                if (qry.cols.includes('categoria')) findProps.include.push(include1.categoria1)
                if (qry.cols.includes('produccion_area')) findProps.include.push(include1.produccion_area1)
            }

            if (qry.incl) {
                for (const a of qry.incl) {
                    if (qry.incl.includes(a)) findProps.include.push(include1[a])
                }
            }
        }

        let data = await Articulo.findAll(findProps)

        // --- AGREAGAR LOS REF QUE NO ESTÁN EN LA BD --- //
        if (data.length > 0 && qry.cols) {
            data = data.map(a => a.toJSON())

            const activo_estadosMap = cSistema.arrayMap('activo_estados')
            const igv_afectacionesMap = cSistema.arrayMap('igv_afectaciones')
            const estadosMap = cSistema.arrayMap('estados')

            for (const a of data) {
                if (qry.cols.includes('activo')) a.activo1 = activo_estadosMap[a.activo]
                if (qry.cols.includes('igv_afectacion')) a.igv_afectacion1 = igv_afectacionesMap[a.igv_afectacion]
                if (qry.cols.includes('has_receta')) a.has_receta1 = estadosMap[a.has_receta]
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

        let data = await Articulo.findByPk(id, {
            include: [include1.combo_articulos]
        })

        if (data) {
            data = data.toJSON()
            data.previous_foto_path = data.foto_path
        }

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const delet = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { id } = req.params
        const { foto_path, is_combo } = req.body

        // --- ELIMINAR --- //
        if (is_combo == true) {
            await ComboArticulo.destroy({
                where: { articulo_principal: id },
                transaction
            })
        }

        const deletedCount = await Articulo.destroy({
            where: { id },
            transaction
        })

        await transaction.commit()

        if (deletedCount > 0) {
            if (foto_path != null) deleteFile(foto_path)

            res.json({ code: 0 })
        }
        else {
            await transaction.rollback()

            res.json({ code: 1, msg: 'No se eliminó ningún registro' })
        }
    }
    catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const createBulk = async (req, res) => {
    const transaction = await sequelize.transaction()

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
            empresa: empresa.id,
            createdBy: colaborador
        }))

        await Articulo.bulkCreate(send, { transaction })
        await transaction.commit()

        res.json({ code: 0 })
    }
    catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const deleteBulk = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { ids } = req.body

        // --- ELIMINAR --- //
        const deletedCount = await Articulo.destroy({
            where: {
                id: {
                    [Op.in]: ids
                }
            },
            transaction
        })

        const send = deletedCount > 0 ? { code: 0 } : { code: 1, msg: 'No se eliminó ningún registro' }

        await transaction.commit()

        res.json(send)
    }
    catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const updateBulk = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { ids, prop, val } = req.body

        const edit = { [prop]: val }

        // --- MODIFICAR --- //
        await Articulo.update(
            edit,
            {
                where: {
                    id: {
                        [Op.in]: ids
                    }
                },
                transaction
            }
        )

        await transaction.commit()

        res.json({ code: 0 })
    }
    catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}


// --- Funciones --- //
async function loadOne(id) {
    let data = await Articulo.findByPk(id, {
        include: [include1.categoria1, include1.produccion_area1]
    })

    if (data) {
        data = data.toJSON()

        const activo_estadosMap = cSistema.arrayMap('activo_estados')
        const igv_afectacionesMap = cSistema.arrayMap('igv_afectaciones')
        const estadosMap = cSistema.arrayMap('estados')

        data.activo1 = activo_estadosMap[data.activo]
        data.igv_afectacion1 = igv_afectacionesMap[data.igv_afectacion]
        data.has_receta1 = estadosMap[data.has_receta]

        data.previous_foto_path = data.foto_path
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