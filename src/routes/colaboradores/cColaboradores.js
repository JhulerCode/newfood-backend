import sequelize from '../../database/sequelize.js'
import { Colaborador } from '../../database/models/Colaborador.js'
import { Sequelize, Op } from 'sequelize'
import { existe, applyFilters } from '../../utils/mine.js'
import cSistema from "../_sistema/cSistema.js"
import bcrypt from 'bcrypt'
import { sessionStore, borrarSesion, actualizarSesion, obtenerSesion } from '../_signin/sessions.js'


const create = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador } = req.user
        const {
            nombres, apellidos,
            doc_tipo, doc_numero,
            fecha_nacimiento, sexo,
            correo, telefono,
            ubigeo, direccion,
            cargo, sueldo, activo,
            has_signin, permisos, vista_inicial,
        } = req.body

        let { usuario, contrasena } = req.body

        // ----- VERIFY SI EXISTE NOMBRE ----- //
        if (await existe(Colaborador, { nombres, apellidos }, res) == true) return

        if (usuario) {
            if (await existe(Colaborador, { usuario }, res) == true) return
        }

        if (has_signin == false) {
            usuario = null
            contrasena = null
        }

        // ----- CREAR ----- //
        const nuevo = await Colaborador.create({
            nombres, apellidos,
            doc_tipo, doc_numero,
            fecha_nacimiento, sexo,
            correo, telefono,
            ubigeo, direccion,
            cargo, sueldo, activo,
            has_signin, usuario, permisos, vista_inicial,
            createdBy: colaborador
        }, { transaction })

        // ----- ACTUALIZAR CONTRASENA ----- //
        if (contrasena != '*****' && contrasena != null) {
            contrasena = await bcrypt.hash(contrasena, 10)
            await Colaborador.update(
                { contrasena },
                {
                    where: { id: nuevo.id },
                    transaction
                }
            )
        }

        await transaction.commit()

        // ----- DEVOLVER ----- //
        const data = await loadOne(nuevo.id)
        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const update = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { id } = req.params
        const { colaborador } = req.user
        const {
            nombres, apellidos,
            doc_tipo, doc_numero,
            fecha_nacimiento, sexo,
            correo, telefono,
            ubigeo, direccion,
            cargo, sueldo, activo,
            has_signin, permisos, vista_inicial
        } = req.body

        let { usuario, contrasena } = req.body

        // ----- VERIFY SI EXISTE NOMBRE ----- //
        if (await existe(Colaborador, { nombres, apellidos, id }, res) == true) return

        if (usuario) {
            if (await existe(Colaborador, { usuario, id }, res) == true) return
        }

        if (has_signin == false) {
            usuario = null
            contrasena = null

            // ----- ELIMINAR DE SESSIONSTORE -----//
            borrarSesion(id)
        }

        // ----- ACTUALIZAR -----//
        const [affectedRows] = await Colaborador.update(
            {
                nombres, apellidos,
                doc_tipo, doc_numero,
                fecha_nacimiento, sexo,
                correo, telefono,
                ubigeo, direccion,
                cargo, sueldo, activo,
                has_signin, usuario, permisos, vista_inicial,
                updatedBy: colaborador
            },
            {
                where: { id },
                transaction
            }
        )

        if (affectedRows > 0) {
            // ----- ACTUALIZAR CONTRASENA ----- //
            if (contrasena == null) {
                await Colaborador.update(
                    { contrasena: null },
                    {
                        where: { id },
                        transaction
                    }
                )
            }
            else {
                if (contrasena != '*****') {
                    contrasena = await bcrypt.hash(contrasena, 10)

                    await Colaborador.update(
                        { contrasena },
                        {
                            where: { id },
                            transaction
                        }
                    )
                }
            }

            // ----- ACTUALIZAR EN SESSIONSTORE ----- //
            actualizarSesion(id, { nombres, apellidos, cargo, vista_inicial, permisos })

            await transaction.commit()

            // ----- DEVOLVER ----- //
            const data = await loadOne(id)
            res.json({ code: 0, data })
        }
        else {
            await transaction.commit()

            res.json({ code: 1, msg: 'No se actualizó ningún registro' })
        }
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

async function loadOne(id) {
    let data = await Colaborador.findByPk(id)

    if (data) {
        data = data.toJSON()

        const generosMap = cSistema.arrayMap('generos')
        const documentos_identidadMap = cSistema.arrayMap('documentos_identidad')
        const estadosMap = cSistema.arrayMap('estados')

        data.sexo1 = generosMap[data.sexo]
        data.doc_tipo1 = documentos_identidadMap[data.doc_tipo]
        data.activo1 = estadosMap[data.activo]
        data.has_signin1 = estadosMap[data.has_signin]
    }

    return data
}

const find = async (req, res) => {
    try {
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        const findProps = {
            attributes: ['id'],
            order: [[Sequelize.literal(`TRIM(CONCAT(COALESCE(nombres, ''), ' ', COALESCE(apellidos, '')))`), 'ASC']],
            where: {}
        }

        if (qry) {
            if (qry.fltr) {
                Object.assign(findProps.where, applyFilters(qry.fltr))
            }

            if (qry.cols) {
                findProps.attributes = findProps.attributes.concat(qry.cols)
            }
        }

        let data = await Colaborador.findAll(findProps)

        if (data.length > 0 && qry.cols) {
            data = data.map(a => a.toJSON())

            const generosMap = cSistema.arrayMap('generos')
            const documentos_identidadMap = cSistema.arrayMap('documentos_identidad')
            const estadosMap = cSistema.arrayMap('estados')

            for (const a of data) {
                if (qry.cols.includes('sexo')) a.sexo1 = generosMap[a.sexo]
                if (qry.cols.includes('doc_tipo')) a.doc_tipo1 = documentos_identidadMap[a.doc_tipo]
                if (qry.cols.includes('activo')) a.activo1 = estadosMap[a.activo]
                if (qry.cols.includes('has_signin')) a.has_signin1 = estadosMap[a.has_signin]
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

        const uno = await Colaborador.findByPk(id)

        if (uno == null) {
            res.json({ code: 1, msg: 'No encontrado' })
        }
        else {
            const data = uno.toJSON()
            if (data.contrasena != null) data.contrasena = '*****'

            res.json({ code: 0, data })
        }
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const delet = async (req, res) => {
    try {
        const { id } = req.params

        const deletedCount = await Colaborador.destroy({ where: { id } })

        borrarSesion(id)

        const send = deletedCount > 0 ? { code: 0 } : { code: 1, msg: 'No se eliminó ningún registro' }

        res.json(send)
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const preferencias = async (req, res) => {
    try {
        const { id } = req.params
        const { theme, color, format_date, menu_visible } = req.body

        await Colaborador.update({ theme, color, format_date, menu_visible }, { where: { id } })

        // ----- ACTUALIZAR SESION ----- //
        actualizarSesion(id, { theme, color, format_date, menu_visible })

        res.json({ code: 0 })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}



const login = async (req, res) => {
    try {
        const { colaborador } = req.user

        const u = await Colaborador.findByPk(colaborador)
        if (u == null) return res.json({ code: 1, msg: 'Sesión terminada' })

        await Colaborador.update({ lastSignin: Sequelize.literal('current_timestamp') }, { where: { id: colaborador } })

        res.json({ code: 0, data: { ...req.user } })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

export default {
    find,
    create,
    findById,
    update,
    delet,

    preferencias,

    login,
}