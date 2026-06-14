import sequelize from '#infrastructure/db/sequelize.js'
import {
    SucursalRepository,
    SucursalArticuloRepository,
    SucursalComprobanteTipoRepository,
    SucursalPagoMetodoRepository,
    ArticuloRepository,
    ComprobanteTipoRepository,
    PagoMetodoRepository,
    ImpresionAreaRepository,
} from '#db/repositories.js'
import { arrayMap } from '#store/system.js'
import { borrarSucursal, guardarSucursal, actualizarSucursal } from '#store/sucursales.js'

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        qry.fltr.empresa = { op: 'Es', val: empresa }

        let data = await SucursalRepository.find(qry, true)

        if (data.length > 0) {
            const activo_estadosMap = arrayMap('activo_estados')
            const printer_estadosMap = arrayMap('printer_estados')

            for (const a of data) {
                if (qry?.cols?.includes('activo')) a.activo1 = activo_estadosMap[a.activo]
                if (qry?.cols?.includes('printer_status')) {
                    a.printer_status1 = printer_estadosMap[a.printer_status]
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
        const { id } = req.params

        const data = await SucursalRepository.find({ id })

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const create = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador, empresa } = req.user
        const { codigo, direccion, telefono, correo, activo } = req.body

        // --- VERIFY SI EXISTE NOMBRE --- //
        if ((await SucursalRepository.existe({ codigo, empresa }, res)) == true) return

        // --- CREAR --- //
        const nuevo = await SucursalRepository.create(
            {
                codigo,
                direccion,
                telefono,
                correo,
                activo,
                empresa,
                createdBy: colaborador,
            },
            transaction,
        )

        const qry = {
            fltr: { empresa: { op: 'Es', val: empresa } },
        }

        // --- CREAR TIPOS DE COMPROBANTE --- //
        const produccion_areas = await ComprobanteTipoRepository.find(qry, true)
        const produccion_areas_new = produccion_areas.map((a) => ({
            sucursal: nuevo.id,
            comprobante_tipo: a.id,
            estado: true,
            empresa,
            createdBy: colaborador,
        }))
        if (produccion_areas_new.length > 0) {
            await SucursalComprobanteTipoRepository.createBulk(produccion_areas_new, transaction)
        }

        // --- CREAR MÉTODOS DE PAGO --- //
        const pago_metodos = await PagoMetodoRepository.find(qry, true)
        const pago_metodos_new = pago_metodos.map((a) => ({
            sucursal: nuevo.id,
            pago_metodo: a.id,
            estado: true,
            empresa,
            createdBy: colaborador,
        }))
        if (pago_metodos_new.length > 0) {
            await SucursalPagoMetodoRepository.createBulk(pago_metodos_new, transaction)
        }

        // --- CREAR ARTICULOS --- //
        const articulos = await ArticuloRepository.find(qry, true)
        const articulos_new = articulos.map((a) => ({
            sucursal: nuevo.id,
            articulo: a.id,
            estado: true,
            empresa,
            createdBy: colaborador,
        }))
        if (articulos_new.length > 0) {
            await SucursalArticuloRepository.createBulk(articulos_new, transaction)
        }

        // --- CREAR IMPRESORA CAJA --- //
        await ImpresionAreaRepository.create(
            {
                nombre: 'CAJA',
                impresora_tipo: '1',
                impresora: 'CAJA',

                sucursal: nuevo.id,
                empresa,
                createdBy: colaborador,
            },
            transaction,
        )

        await transaction.commit()

        const data = await loadOne(nuevo.id)
        data.impresora_caja = {
            impresora_tipo: '1',
            impresora: 'CAJA',
        }

        guardarSucursal(nuevo.id, data)

        res.json({ code: 0, data })
    } catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const update = async (req, res) => {
    try {
        const { colaborador, empresa } = req.user
        const { id } = req.params
        const { codigo, direccion, telefono, correo, activo } = req.body

        // --- VERIFY SI EXISTE NOMBRE --- //
        if ((await SucursalRepository.existe({ codigo, id, empresa }, res)) == true) return

        // --- ACTUALIZAR --- //
        const updated = await SucursalRepository.update(
            { id },
            {
                codigo,
                direccion,
                telefono,
                correo,
                activo,
                updatedBy: colaborador,
            },
        )

        if (updated == false) return resUpdateFalse(res)

        const data = await loadOne(id)
        actualizarSucursal(id, data)

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const delet = async (req, res) => {
    try {
        const { id } = req.params

        // --- ACTUALIZAR --- //
        if ((await SucursalRepository.delete({ id })) == false) return resDeleteFalse(res)

        borrarSucursal(id)

        res.json({ code: 0 })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

// --- Funciones --- //
async function loadOne(id) {
    const data = await SucursalRepository.find({ id }, true)

    if (data) {
        const activo_estadosMap = arrayMap('activo_estados')
        const printer_estadosMap = arrayMap('printer_estados')
        data.activo1 = activo_estadosMap[data.activo]
        data.printer_status1 = printer_estadosMap[data.printer_status]
    }

    return data
}

export default {
    find,
    findById,
    create,
    update,
    delet,
}
