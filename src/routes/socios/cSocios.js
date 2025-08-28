import { Socio } from '../../database/models/Socio.js'
import { Sequelize, Op } from 'sequelize'
import { applyFilters, existe } from '../../utils/mine.js'
import cSistema from "../_sistema/cSistema.js"
import sequelize from '../../database/sequelize.js'

const includes = {
}

const create = async (req, res) => {
    try {
        const { colaborador } = req.user
        const {
            tipo, doc_tipo, doc_numero, nombres,
            telefono, correo, direccion, referencia,
            activo,
        } = req.body

        // ----- VERIFY SI EXISTE NOMBRE ----- //
        if (await existe(Socio, { tipo, doc_numero }, res, `El socio comercial ya existe`) == true) return

        // ----- CREAR ----- //
        const nuevo = await Socio.create({
            tipo, doc_tipo, doc_numero, nombres,
            telefono, correo, direccion, referencia,
            activo,
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
            tipo, doc_tipo, doc_numero, nombres,
            telefono, correo, direccion, referencia,
            activo,
        } = req.body

        // ----- VERIFY SI EXISTE NOMBRE ----- //
        if (await existe(Socio, { tipo, doc_numero, id }, res, `El socio comercial ya existe`) == true) return

        // ----- ACTUALIZAR ----- //
        const [affectedRows] = await Socio.update(
            {
                tipo, doc_tipo, doc_numero, nombres,
                telefono, correo, direccion, referencia,
                activo,
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
    let data = await Socio.findByPk(id)

    if (data) {
        data = data.toJSON()

        const documentos_identidadMap = cSistema.arrayMap('documentos_identidad')
        const activo_estadosMap = cSistema.arrayMap('activo_estados')

        data.doc_tipo1 = documentos_identidadMap[data.doc_tipo]
        data.activo1 = activo_estadosMap[data.activo]
    }

    return data
}

const find = async (req, res) => {
    try {
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        const findProps = {
            attributes: ['id'],
            order: [['nombres', 'ASC']],
            where: {},
            include: []
        }

        if (qry) {
            if (qry.fltr) {
                Object.assign(findProps.where, applyFilters(qry.fltr))
            }

            if (qry.cols) {
                findProps.attributes = findProps.attributes.concat(qry.cols)

                // ----- AGREAGAR LOS REF QUE SI ESTÁN EN LA BD ----- //
                if (qry.cols.includes('precio_lista')) findProps.include.push(includes.precio_lista1)
            }

            if (qry.incl) {
                for (const a of qry.incl) {
                    if (qry.incl.includes(a)) findProps.include.push(includes[a])
                }
            }
        }

        let data = await Socio.findAll(findProps)

        if (data.length > 0 && qry.cols) {
            data = data.map(a => a.toJSON())

            const documentos_identidadMap = cSistema.arrayMap('documentos_identidad')
            const activo_estadosMap = cSistema.arrayMap('activo_estados')

            for (const a of data) {
                if (qry.cols.includes('doc_tipo')) a.doc_tipo1 = documentos_identidadMap[a.doc_tipo]
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

        const data = await Socio.findByPk(id)

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
        const deletedCount = await Socio.destroy({ where: { id } })

        const send = deletedCount > 0 ? { code: 0 } : { code: 1, msg: 'No se eliminó ningún registro' }

        res.json(send)
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const deleteBulk = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { ids } = req.body

        // ----- ELIMINAR ----- //
        const deletedCount = await Socio.destroy({
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
        await Socio.update(
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
    create,
    find,
    findById,
    delet,
    update,

    deleteBulk,
    updateBulk,
}