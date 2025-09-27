import { RecetaInsumo } from '../../database/models/RecetaInsumo.js'
import { Articulo } from '../../database/models/Articulo.js'
import { applyFilters } from '../../utils/mine.js'

const create = async (req, res) => {
    try {
        const { colaborador, empresa } = req.user
        const { articulo_principal, articulo, cantidad, orden } = req.body

        // --- CREAR --- //
        const nuevo = await RecetaInsumo.create({
            articulo_principal, articulo, cantidad, orden,
            empresa: empresa.id,
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
        const { articulo_principal, articulo, cantidad, orden } = req.body

        // --- ACTUALIZAR --- //
        const [affectedRows] = await RecetaInsumo.update(
            {
                cantidad, orden,
                updatedBy: colaborador
            },
            { where: { id } }
        )

        if (affectedRows > 0) {
            res.json({ code: 0 })
        }
        else {
            res.json({ code: 1, msg: 'No se actualizó ningún registro' })
        }
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        const findProps = {
            attributes: ['id'],
            order: [['orden', 'ASC']],
            where: { empresa: empresa.id },
            include: []
        }

        const include1 = {
            articulo1: {
                model: Articulo,
                as: 'articulo1',
                attributes: ['nombre', 'unidad'],
            }
        }

        if (qry) {
            if (qry.fltr) {
                Object.assign(findProps.where, applyFilters(qry.fltr))
            }

            if (qry.cols) {
                findProps.attributes = findProps.attributes.concat(qry.cols)
            }

            if (qry.incl) {
                for (const a of qry.incl) {
                    if (qry.incl.includes(a)) findProps.include.push(include1[a])
                }
            }
        }

        const data = await RecetaInsumo.findAll(findProps)

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
        const deletedCount = await RecetaInsumo.destroy({ where: { id } })

        const send = deletedCount > 0 ? { code: 0 } : { code: 1, msg: 'No se eliminó ningún registro' }

        res.json(send)
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}


// --- Funciones --- //
async function loadOne(id) {
    let data = await RecetaInsumo.findByPk(id, {
        include: {
            model: Articulo,
            as: 'articulo1',
            attributes: ['nombre', 'unidad']
        }
    })

    return data
}

export default {
    find,
    create,
    delet,
    update,
}