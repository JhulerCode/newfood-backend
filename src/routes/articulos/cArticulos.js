import { Op, Sequelize } from 'sequelize'
import sequelize from '../../database/sequelize.js'
import { Articulo } from '../../database/models/Articulo.js'
import { ArticuloCategoria } from '../../database/models/ArticuloCategoria.js'
import { ProduccionArea } from '../../database/models/ProduccionArea.js'
import { existe, applyFilters } from '../../utils/mine.js'
import cSistema from "../_sistema/cSistema.js"

const includes = {
    categoria1: {
        model: ArticuloCategoria,
        as: 'categoria1',
        attributes: ['id', 'nombre']
    },
    produccion_area1: {
        model: ProduccionArea,
        as: 'produccion_area1',
        attributes: ['id', 'nombre']
    }
}

const create = async (req, res) => {
    try {
        const { colaborador } = req.user
        const {
            codigo_barra, nombre, unidad, marca, activo,
            igv_afectacion,
            tipo, categoria,
            produccion_area, has_receta,
            is_combo, combo_articulos,
            precio_venta,
        } = req.body

        // ----- VERIFY SI EXISTE NOMBRE ----- //
        if (await existe(Articulo, { nombre }, res) == true) return


        // ----- CREAR ----- //
        const nuevo = await Articulo.create({
            codigo_barra, nombre, unidad, marca, activo,
            igv_afectacion,
            tipo, categoria,
            produccion_area, has_receta,
            is_combo, combo_articulos,
            precio_venta,
            createdBy: colaborador
        })

        const data = await loadOne(nuevo.id)

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const update = async (req, res) => {
    try {
        const { colaborador } = req.user
        const { id } = req.params
        const {
            codigo_barra, nombre, unidad, marca, activo,
            igv_afectacion,
            tipo, categoria,
            produccion_area, has_receta,
            is_combo, combo_articulos,
            precio_venta,
        } = req.body

        // ----- VERIFY SI EXISTE NOMBRE ----- //
        if (await existe(Articulo, { nombre, codigo_barra, id }, res) == true) return

        // ----- ACTUALIZAR ----- //
        const [affectedRows] = await Articulo.update(
            {
                codigo_barra, nombre, unidad, marca, activo,
                igv_afectacion,
                tipo, categoria,
                produccion_area, has_receta,
                is_combo, combo_articulos,
                precio_venta,
                updatedBy: colaborador
            },
            { where: { id } }
        )

        if (affectedRows > 0) {
            const data = await loadOne(id)

            res.json({ code: 0, data })
        }
        else {
            await transaction.rollback()

            res.json({ code: 1, msg: 'No se actualizó ningún registro' })
        }
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

async function loadOne(id) {
    let data = await Articulo.findByPk(id, {
        include: [includes.categoria1, includes.produccion_area1]
    })

    if (data) {
        data = data.toJSON()

        const activo_estadosMap = cSistema.arrayMap('activo_estados')
        const igv_afectacionesMap = cSistema.arrayMap('igv_afectaciones')
        const estadosMap = cSistema.arrayMap('estados')

        data.activo1 = activo_estadosMap[data.activo]
        data.igv_afectacion1 = igv_afectacionesMap[data.igv_afectacion]
        data.has_receta1 = estadosMap[data.has_receta]
    }

    return data
}

const find = async (req, res) => {
    try {
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        const findProps = {
            attributes: ['id'],
            order: [['tipo', 'ASC'], ['nombre', 'ASC']],
            where: {},
            include: []
        }

        if (qry) {
            if (qry.fltr) {
                Object.assign(findProps.where, applyFilters(qry.fltr))
            }

            if (qry.cols) {
                findProps.attributes = findProps.attributes.concat(qry.cols)

                // if (qry.cols.includes('stock')) findProps.attributes.push(sqlStock)
                // if (qry.cols.includes('valor')) findProps.attributes.push(sqlValor)

                // ----- AGREAGAR LOS REF QUE SI ESTÁN EN LA BD ----- //
                if (qry.cols.includes('categoria')) findProps.include.push(includes.categoria1)
                if (qry.cols.includes('produccion_area')) findProps.include.push(includes.produccion_area1)
            }

            if (qry.incl) {
                for (const a of qry.incl) {
                    if (qry.incl.includes(a)) findProps.include.push(includes[a])
                }
            }
        }

        let data = await Articulo.findAll(findProps)

        // ----- AGREAGAR LOS REF QUE NO ESTÁN EN LA BD ----- //
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

        const data = await Articulo.findByPk(id)

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const delet = async (req, res) => {
    try {
        const { id } = req.params

        // ----- ELIMINAR ----- //
        const deletedCount = await Articulo.destroy({ where: { id } })

        const send = deletedCount > 0 ? { code: 0 } : { code: 1, msg: 'No se eliminó ningún registro' }

        res.json(send)
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const createBulk = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { tipo, articulos } = req.body
        const { colaborador } = req.user
        // console.log(articulos)
        const send = articulos.map(a => ({
            // codigo_barra: a.EAN,
            nombre: a.Nombre,
            unidad: a.Unidad,
            marca: a.Marca,

            // vende: tipo == 1 ? false : true,
            // has_fv: tipo == 1 ? false : true,
            activo: true,

            igv_afectacion: a.Tributo,

            tipo,
            categoria: a.Categoria,
            // produccion_tipo: a.Tipo_produccion,
            // filtrantes: a.Sobres_caja,
            is_combo: false,

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

        // ----- ELIMINAR ----- //
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

        // ----- MODIFICAR ----- //
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