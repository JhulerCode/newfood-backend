import { Repository } from '#db/Repository.js'
import { arrayMap } from '#store/system.js'

const repository = new Repository('Socio')

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        qry.fltr.empresa = { op: 'Es', val: empresa }

        let data = await repository.find(qry, true)

        if (data.length > 0) {
            const documentos_identidadMap = arrayMap('documentos_identidad')
            const activo_estadosMap = arrayMap('activo_estados')

            for (const a of data) {
                if (qry?.cols?.includes('doc_tipo')) a.doc_tipo1 = documentos_identidadMap[a.doc_tipo]
                if (qry?.cols?.includes('activo')) a.activo1 = activo_estadosMap[a.activo]
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

        const data = await repository.find({ id })

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const create = async (req, res) => {
    try {
        const { colaborador, empresa } = req.user
        const {
            tipo, doc_tipo, doc_numero, nombres,
            telefono, correo, direccion, referencia,
            activo,
        } = req.body

        // --- VERIFY SI EXISTE NOMBRE --- //
        const msg = tipo == 2 ? 'El cliente ya existe' : 'El proveedor ya existe'
        if (await repository.existe({ tipo, doc_numero, empresa }, res, msg) == true) return

        // --- CREAR --- //
        const nuevo = await repository.create({
            tipo, doc_tipo, doc_numero, nombres,
            telefono, correo, direccion, referencia,
            activo,
            empresa,
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
        const { colaborador, empresa } = req.user
        const { id } = req.params
        const {
            tipo, doc_tipo, doc_numero, nombres,
            telefono, correo, direccion, referencia,
            activo,
        } = req.body

        // --- VERIFY SI EXISTE NOMBRE --- //
        const msg = tipo == 2 ? 'El cliente ya existe' : 'El proveedor ya existe'
        if (await repository.existe({ tipo, doc_numero, id, empresa }, res, msg) == true) return

        // --- ACTUALIZAR --- //
        const updated = await repository.update({ id }, {
            tipo, doc_tipo, doc_numero, nombres,
            telefono, correo, direccion, referencia,
            activo,
            updatedBy: colaborador
        })

        if (updated == false) return resUpdateFalse(res)

        const data = await loadOne(id)

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
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}


// --- Funciones --- //
async function loadOne(id) {
    const data = await repository.find({ id }, true)

    if (data) {
        const documentos_identidadMap = arrayMap('documentos_identidad')
        const activo_estadosMap = arrayMap('activo_estados')

        data.doc_tipo1 = documentos_identidadMap[data.doc_tipo]
        data.activo1 = activo_estadosMap[data.activo]
    }

    return data
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