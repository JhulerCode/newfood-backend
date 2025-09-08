import { ArticuloCategoria } from '../../database/models/ArticuloCategoria.js'
import { existe, applyFilters } from '../../utils/mine.js'
import cSistema from "../_sistema/cSistema.js"

const create = async (req, res) => {
    try {
        const { colaborador } = req.user
        const { tipo, nombre, color, activo } = req.body

       // --- VERIFY SI EXISTE NOMBRE --- //
        if (await existe(ArticuloCategoria, { nombre }, res) == true) return

       // --- CREAR --- //
        const nuevo = await ArticuloCategoria.create({
            tipo, nombre, color, activo,
            createdBy: colaborador,
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
        const { tipo, nombre, color, activo } = req.body

       // --- VERIFY SI EXISTE NOMBRE --- //
        if (await existe(ArticuloCategoria, { nombre, id }, res) == true) return

       // --- ACTUALIZAR --- //
        const [affectedRows] = await ArticuloCategoria.update(
            {
                tipo, nombre, color, activo,
                updatedBy: colaborador
            },
            { where: { id } }
        )

        if (affectedRows > 0) {
            const data = await loadOne(id)

            res.json({ code: 0, data })
        }
        else {
            res.json({ code: 1, msg: 'No se actualizó ningún registro' })
        }
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

async function loadOne(id) {
    let data = await ArticuloCategoria.findByPk(id)

    if (data) {
        data = data.toJSON()

        const articulo_tiposMap = cSistema.arrayMap('articulo_tipos')
        const activo_estadosMap = cSistema.arrayMap('activo_estados')

        data.tipo1 = articulo_tiposMap[data.tipo]
        data.activo1 = activo_estadosMap[data.activo]
    }

    return data
}

const find = async (req, res) => {
    try {
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        const findProps = {
            attributes: ['id', 'nombre'],
            order: [['nombre', 'ASC']],
            where: {},
        }

        if (qry) {
            if (qry.fltr) {
                Object.assign(findProps.where, applyFilters(qry.fltr))
            }

            if (qry.cols) {
                findProps.attributes = findProps.attributes.concat(qry.cols)
            }
        }

        let data = await ArticuloCategoria.findAll(findProps)

        if (data.length > 0 && qry.cols) {
            data = data.map(a => a.toJSON())

            const articulo_tiposMap = cSistema.arrayMap('articulo_tipos')
            const activo_estadosMap = cSistema.arrayMap('activo_estados')

            for (const a of data) {
                if (qry.cols.includes('tipo')) a.tipo1 = articulo_tiposMap[a.tipo]
                if (qry.cols.includes('activo')) a.activo1 = activo_estadosMap[a.activo]
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

        const data = await ArticuloCategoria.findByPk(id)

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const delet = async (req, res) => {
    try {
        const { id } = req.params

       // --- ELIMINAR --- //
        const deletedCount = await ArticuloCategoria.destroy({ where: { id } })

        const send = deletedCount > 0 ? { code: 0 } : { code: 1, msg: 'No se eliminó ningún registro' }

        res.json(send)
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

export default {
    find,
    findById,
    create,
    delet,
    update
}