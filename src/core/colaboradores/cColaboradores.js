import { Repository } from '#db/Repository.js'
import { arrayMap } from '#store/system.js'
import bcrypt from 'bcrypt'
import { borrarSesion, actualizarSesion } from '#store/sessions.js'
import { resUpdateFalse, resDeleteFalse } from '#http/helpers.js'

const repository = new Repository('Colaborador')

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        qry.fltr.empresa = { op: 'Es', val: empresa }

        const data = await repository.find(qry, true)

        if (data.length > 0) {
            const generosMap = arrayMap('generos')
            const documentos_identidadMap = arrayMap('documentos_identidad')
            const activo_estadosMap = arrayMap('activo_estados')
            const estadosMap = arrayMap('estados')

            for (const a of data) {
                if (qry.cols.includes('sexo')) a.sexo1 = generosMap[a.sexo]
                if (qry.cols.includes('doc_tipo')) a.doc_tipo1 = documentos_identidadMap[a.doc_tipo]
                if (qry.cols.includes('activo')) a.activo1 = activo_estadosMap[a.activo]
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

        const data = await repository.find({ id }, true)

        if (data == null) {
            res.json({ code: 1, msg: 'No encontrado' })
        }
        else {
            if (data.contrasena != null) data.contrasena = '*****'

            res.json({ code: 0, data })
        }
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const create = async (req, res) => {
    try {
        const { colaborador, empresa } = req.user
        const {
            nombres, apellidos,
            doc_tipo, doc_numero,
            fecha_nacimiento, sexo,
            correo, telefono, ubigeo, direccion,
            cargo, sueldo, activo,
            has_signin, permisos, vista_inicial,
        } = req.body

        let { usuario, contrasena } = req.body

        // ----- VERIFY SI EXISTE NOMBRE ----- //
        if (await repository.existe({ nombres, apellidos, empresa }, res) == true) return

        if (has_signin) {
            if (await repository.existe({ usuario }, res) == true) return
            contrasena = await bcrypt.hash(contrasena, 10)
        }
        else {
            usuario = null
            contrasena = null
        }

        // ----- CREAR ----- //
        const nuevo = await repository.create({
            nombres, apellidos,
            doc_tipo, doc_numero,
            fecha_nacimiento, sexo,
            correo, telefono, ubigeo, direccion,
            cargo, sueldo, activo,
            has_signin, usuario, contrasena, permisos, vista_inicial,
            empresa,
            createdBy: colaborador
        })

        // ----- DEVOLVER ----- //
        const data = await loadOne(nuevo.id)
        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const update = async (req, res) => {
    try {
        const { colaborador, empresa } = req.user
        const { id } = req.params
        const {
            nombres, apellidos,
            doc_tipo, doc_numero,
            fecha_nacimiento, sexo,
            correo, telefono, ubigeo, direccion,
            cargo, sueldo, activo,
            has_signin, permisos, vista_inicial
        } = req.body

        let { usuario, contrasena } = req.body

        // --- VERIFY SI EXISTE NOMBRE --- //
        if (await repository.existe({ nombres, apellidos, id, empresa }, res) == true) return

        if (has_signin) {
            if (await repository.existe({ usuario, id, empresa }, res, 'El usuario ya existe') == true) return
            contrasena = contrasena != '*****' ? await bcrypt.hash(contrasena, 10) : undefined
        }
        else {
            usuario = null
            contrasena = null

            borrarSesion(id)
        }

        //--- ACTUALIZAR ---//
        const updated = await repository.update({ id }, {
            nombres, apellidos,
            doc_tipo, doc_numero,
            fecha_nacimiento, sexo,
            correo, telefono, ubigeo, direccion,
            cargo, sueldo, activo,
            has_signin, usuario, contrasena, permisos, vista_inicial,
            updatedBy: colaborador
        })

        if (updated == false) return resUpdateFalse(res)

        const data = await loadOne(id)
        actualizarSesion(id, data)

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const delet = async (req, res) => {
    try {
        const { id } = req.params

        if (await repository.delete({ id }) == false) return resDeleteFalse(res)

        borrarSesion(id)

        res.json({ code: 0 })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}


const login = async (req, res) => {
    try {
        res.json({ code: 0, data: req.user, empresa: req.empresa })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const reloadUsuario = async (req, res) => {
    try {
        const { id } = req.user
        const data = await loadOne(id)
        actualizarSesion(id, data)

        res.json({ code: 0, data, empresa: req.empresa })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const preferencias = async (req, res) => {
    try {
        const { id } = req.params
        const { theme, color, format_date, menu_visible } = req.body

        const updated = await repository.update({ id }, { theme, color, format_date, menu_visible })

        if (updated == false) return resUpdateFalse(res)

        actualizarSesion(id, { theme, color, format_date, menu_visible })

        res.json({ code: 0 })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const tables = async (req, res) => {
    try {
        const { id } = req.params
        const { tables } = req.body

        const updated = await repository.update({ id }, { tables })
        if (updated == false) return resUpdateFalse(res)
        actualizarSesion(id, { tables })

        res.json({ code: 0 })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const avances = async (req, res) => {
    try {
        const { id } = req.params
        const { avances } = req.body

        const updated = await repository.update({ id }, { avances })

        if (updated == false) return resUpdateFalse(res)

        actualizarSesion(id, { avances })

        res.json({ code: 0 })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}


//--- Helpers ---//
async function loadOne(id) {
    let data = await repository.find({ id }, true)

    if (data) {
        const generosMap = arrayMap('generos')
        const documentos_identidadMap = arrayMap('documentos_identidad')
        const activo_estadosMap = arrayMap('activo_estados')
        const estadosMap = arrayMap('estados')

        data.sexo1 = generosMap[data.sexo]
        data.doc_tipo1 = documentos_identidadMap[data.doc_tipo]
        data.activo1 = activo_estadosMap[data.activo]
        data.has_signin1 = estadosMap[data.has_signin]
    }

    return data
}

export default {
    find,
    create,
    findById,
    update,
    delet,

    login,
    reloadUsuario,
    preferencias,
    tables,
    avances,
}