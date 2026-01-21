import { Repository } from '#db/Repository.js'
import { arrayMap } from '#store/system.js'
import { resUpdateFalse } from '#http/helpers.js'
import sequelize from '#db/sequelize.js'

const repository = new Repository('Transaccion')
const CajaAperturaRepository = new Repository('CajaApertura')
const TransaccionItemRepository = new Repository('TransaccionItem')
const KardexRepository = new Repository('Kardex')
const ComprobanteRepository = new Repository('Comprobante')

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        qry.fltr.empresa = { op: 'Es', val: empresa }

        const data = await repository.find(qry, true)

        if (data.length > 0) {
            const venta_canalesMap = arrayMap('venta_canales')
            const pago_condicionesMap = arrayMap('pago_condiciones')
            const transaccion_estadosMap = arrayMap('transaccion_estados')
            const estados = arrayMap('estados')

            for (const a of data) {
                if (qry?.cols?.includes('venta_canal'))
                    a.venta_canal1 = venta_canalesMap[a.venta_canal]
                if (qry?.cols?.includes('pago_condicion'))
                    a.pago_condicion1 = pago_condicionesMap[a.pago_condicion]
                if (qry?.cols?.includes('estado')) a.estado1 = transaccion_estadosMap[a.estado]
                if (qry?.cols?.includes('venta_facturado'))
                    a.venta_facturado1 = estados[a.venta_facturado]
                if (qry?.cols?.includes('venta_entregado'))
                    a.venta_entregado1 = estados[a.venta_entregado]
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

        const qry = req.query.qry ? JSON.parse(req.query.qry) : null
        const data = await repository.find({ id, ...qry }, true)

        if (data) {
            const pago_condicionesMap = arrayMap('pago_condiciones')
            const transaccion_estadosMap = arrayMap('transaccion_estados')

            data.pago_condicion1 = pago_condicionesMap[data.pago_condicion]
            data.estado1 = transaccion_estadosMap[data.estado]
        }

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const create = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador, empresa } = req.user
        const {
            tipo,
            fecha,
            socio,
            pago_condicion,
            monto,
            observacion,
            estado,
            anulado_motivo,
            compra_comprobante,
            compra_comprobante_serie,
            compra_comprobante_correlativo,
            venta_codigo,
            venta_canal,
            venta_mesa,
            venta_pago_metodo,
            venta_pago_con,
            venta_socio_datos,
            venta_entregado,
            transaccion_items,
        } = req.body

        let caja_apertura = {}

        if (tipo == 2) {
            // --- VERIFY SI CAJA ESTÁ APERTURADA --- //
            const qry = {
                fltr: { estado: { op: 'Es', val: '1' }, empresa: { op: 'Es', val: empresa } },
            }

            caja_apertura = await CajaAperturaRepository.find(qry, true)

            if (caja_apertura.length == 0) {
                await transaction.rollback()
                res.json({ code: 1, msg: 'La caja no está aperturada, no puede generar pedidos' })
                return
            }
        }

        // --- CREAR --- //
        const nuevo = await repository.create(
            {
                tipo,
                fecha,
                socio,
                pago_condicion,
                monto,
                observacion,
                estado,
                anulado_motivo,
                compra_comprobante,
                compra_comprobante_serie,
                compra_comprobante_correlativo,
                venta_codigo,
                venta_canal,
                venta_mesa,
                venta_pago_metodo,
                venta_pago_con,
                venta_socio_datos,
                caja_apertura: caja_apertura[0].id,
                empresa,
                createdBy: colaborador,
            },
            transaction,
        )

        // --- GUARDAR ITEMS --- //
        const items = transaccion_items.map((a) => ({
            articulo: a.articulo,
            cantidad: a.cantidad,

            pu: a.pu,
            igv_afectacion: a.igv_afectacion,
            igv_porcentaje: a.igv_porcentaje,

            observacion: a.observacion,
            has_receta: a.has_receta,
            receta_insumos: a.receta_insumos,
            is_combo: a.is_combo,
            combo_articulos: a.combo_articulos,

            transaccion: nuevo.id,
            empresa,
            createdBy: colaborador,
        }))

        await TransaccionItemRepository.createBulk(items, transaction)

        if (tipo == 1) {
            // --- GUARAR KARDEX --- //
            const kardexItems = transaccion_items.map((a) => ({
                tipo,
                fecha,
                articulo: a.articulo,
                cantidad: a.cantidad,
                transaccion: nuevo.id,
                empresa,
                createdBy: colaborador,
            }))

            await KardexRepository.createBulk(kardexItems, transaction)

            // --- ACTUALIZAR STOCK --- //
            const transaccion_tiposMap = arrayMap('kardex_tipos')
            const tipoInfo = transaccion_tiposMap[tipo]
            const signo = tipoInfo.operacion === 1 ? 1 : -1

            const cases = transaccion_items
                .map((a) => `WHEN '${a.articulo}' THEN ${Number(a.cantidad) * signo}`)
                .join(' ')

            const ids = transaccion_items.map((a) => `'${a.articulo}'`).join(',')

            await sequelize.query(
                `
                UPDATE articulos
                SET stock = COALESCE(stock, 0) + CASE id
                    ${cases}
                    ELSE 0
                END
                WHERE id IN (${ids})
            `,
                { transaction },
            )
        }

        await transaction.commit()

        // --- DEVOLVER --- //
        const data = await loadOne(nuevo.id)
        res.json({ code: 0, data })
    } catch (error) {
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
            tipo,
            fecha,
            socio,
            pago_condicion,
            monto,
            observacion,
            estado,
            anulado_motivo,
            compra_comprobante,
            compra_comprobante_serie,
            compra_comprobante_correlativo,
            venta_codigo,
            venta_canal,
            venta_mesa,
            venta_pago_metodo,
            venta_pago_con,
            venta_socio_datos,
            venta_entregado,
            transaccion_items,
            edit_type,
        } = req.body

        const updated = await repository.update(
            { id },
            {
                tipo,
                fecha,
                socio,
                pago_condicion,
                monto,
                observacion,
                estado,
                anulado_motivo,
                compra_comprobante,
                compra_comprobante_serie,
                compra_comprobante_correlativo,
                venta_codigo,
                venta_canal,
                venta_mesa,
                venta_pago_metodo,
                venta_pago_con,
                venta_socio_datos,
                venta_entregado,
                updatedBy: colaborador,
            },
            transaction,
        )

        if (updated == false) return resUpdateFalse(res)

        if (tipo == 2 && edit_type != 'only_detalles') {
            await TransaccionItemRepository.delete({ transaccion: id }, transaction)

            // --- GUARDAR ITEMS --- //
            const items = transaccion_items.map((a) => ({
                articulo: a.articulo,
                cantidad: a.cantidad,

                pu: a.pu,
                igv_afectacion: a.igv_afectacion,
                igv_porcentaje: a.igv_porcentaje,

                observacion: a.observacion,
                has_receta: a.has_receta,
                receta_insumos: a.receta_insumos,
                is_combo: a.is_combo,
                combo_articulos: a.combo_articulos,

                transaccion: id,
                empresa,
                createdBy: colaborador,
            }))

            await TransaccionItemRepository.createBulk(items, transaction)
        }

        await transaction.commit()

        const data = await loadOne(id)

        res.json({ code: 0, data })
    } catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const delet = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { id } = req.params
        const { tipo, estado } = req.body

        await KardexRepository.delete({ transaccion: id }, transaction)

        await TransaccionItemRepository.delete({ transaccion: id }, transaction)

        await repository.delete({ id }, transaction)

        if (estado != 0 && tipo == 1) {
            const transaccion_items = await TransaccionItemRepository.findAll({
                where: { transaccion: id },
                attributes: ['id', 'articulo', 'cantidad'],
            })

            const transaccion_tiposMap = arrayMap('kardex_tipos')
            const tipoInfo = transaccion_tiposMap[tipo]
            const signo = tipoInfo.operacion === 1 ? -1 : 1

            const cases = transaccion_items
                .map((a) => `WHEN '${a.articulo}' THEN ${Number(a.cantidad) * signo}`)
                .join(' ')

            const ids = transaccion_items.map((a) => `'${a.articulo}'`).join(',')

            await sequelize.query(
                `
                    UPDATE articulos
                    SET stock = COALESCE(stock, 0) + CASE id
                        ${cases}
                        ELSE 0
                    END
                    WHERE id IN (${ids})
                `,
                { transaction },
            )
        }

        await transaction.commit()

        res.json({ code: 0 })
    } catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

// --- Para ventas --- //
const anular = async (req, res) => {
    try {
        const { colaborador } = req.user
        const { id } = req.params
        const { anulado_motivo, item } = req.body

        const qry = {
            fltr: { transaccion: { op: 'Es', val: id } },
        }
        const comprobantes = await ComprobanteRepository.find(qry)

        if (comprobantes.length > 0) {
            res.json({ code: 1, msg: 'No se puedee anular, el pedido ya tiene comprobantes' })
            return
        }

        await repository.update(
            { id },
            {
                estado: 0,
                anulado_motivo,
                updatedBy: colaborador,
            },
        )

        // --- DEVOLVER --- //
        const data = await loadOne(id)

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const addProductos = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador, empresa } = req.user
        const { id } = req.params
        const { monto, transaccion_items } = req.body

        const items = transaccion_items.map((a) => ({
            articulo: a.articulo,
            cantidad: a.cantidad,
            pu: a.pu,
            igv_afectacion: a.igv_afectacion,
            igv_porcentaje: a.igv_porcentaje,
            observacion: a.observacion,
            transaccion: id,
            has_receta: a.has_receta,
            receta_insumos: a.receta_insumos,
            is_combo: a.is_combo,
            combo_articulos: a.combo_articulos,
            empresa,
            createdBy: colaborador,
        }))

        await TransaccionItemRepository.createBulk(items, transaction)

        await repository.update(
            { id },
            {
                monto: sequelize.literal(`COALESCE(monto, 0) + ${monto}`),
                updatedBy: colaborador,
            },
            transaction,
        )

        await transaction.commit()

        // --- DEVOLVER --- //
        const data = await loadOne(id)
        res.json({ code: 0, data })
    } catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const cambiarMesa = async (req, res) => {
    try {
        const { colaborador } = req.user
        const { id } = req.params
        const { venta_mesa } = req.body

        await repository.update(
            { id },
            {
                venta_mesa,
                updatedBy: colaborador,
            },
        )

        const data = await loadOne(id)

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const entregar = async (req, res) => {
    try {
        const { colaborador } = req.user
        const { id } = req.params

        // --- ENTREGAR Y FINALIZAR --- //
        await repository.update(
            { id },
            {
                venta_entregado: true,
                estado: 2,
                updatedBy: colaborador,
            },
        )

        const data = await loadOne(id)

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const entregarBulk = async (req, res) => {
    try {
        const { colaborador } = req.user
        const { ids } = req.body

        // --- ENTREGAR Y FINALIZAR --- //
        await repository.update(
            { id: ids },
            {
                venta_entregado: true,
                estado: 2,
                updatedBy: colaborador,
            },
        )

        res.json({ code: 0 })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

// --- Helpers --- //
async function loadOne(id) {
    let data = await repository.find(
        {
            id,
            sqls: ['comprobantes_monto'],
            incl: ['socio1', 'createdBy1', 'venta_mesa1'],
            iccl: {
                venta_mesa1: {
                    incl: ['salon1'],
                },
            },
        },
        true,
    )

    if (data) {
        const pago_condicionesMap = arrayMap('pago_condiciones')
        const transaccion_estadosMap = arrayMap('transaccion_estados')
        const estados = arrayMap('estados')

        data.pago_condicion1 = pago_condicionesMap[data.pago_condicion]
        data.estado1 = transaccion_estadosMap[data.estado]
        data.venta_facturado1 = estados[data.venta_facturado]
        data.venta_entregado1 = estados[data.venta_entregado]
    }

    return data
}

export default {
    create,
    update,
    find,
    findById,
    delet,

    addProductos,
    anular,
    cambiarMesa,
    entregar,
    entregarBulk,
}
