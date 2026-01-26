import {
    ComprobanteRepository,
    ComprobanteItemRepository,
    CajaAperturaRepository,
    TransaccionRepository,
    TransaccionItemRepository,
    ComprobanteTipoRepository,
    SocioRepository,
    KardexRepository,
    ArticuloRepository,
    DineroMovimientoRepository,
} from '#db/repositories.js'
import { arrayMap } from '#store/system.js'
import dayjs from '#shared/dayjs.js'
import sequelize from '#db/sequelize.js'
import TransaccionControler from '#core/transacciones/cTransacciones.js'

import PdfPrinter from 'pdfmake'
import { numeroATexto } from '#shared/mine.js'

import config from '../../config.js'
import { Resend } from 'resend'
import { comprobanteHtml } from '#shared/layouts.js'

import { sendDoc, anularDoc, estadoDoc, xmlDoc } from '#shared/sunat/mifact.js'

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        qry.fltr.empresa = { op: 'Es', val: empresa }

        const data = await ComprobanteRepository.find(qry, true)

        if (data.length > 0) {
            const pago_condicionesMap = arrayMap('pago_condiciones')
            const comprobante_tiposMap = arrayMap('comprobante_tipos')
            const comprobante_estadosMap = arrayMap('comprobante_estados')

            for (const a of data) {
                if (qry?.cols?.includes('pago_condicion'))
                    a.pago_condicion1 = pago_condicionesMap[a.pago_condicion]
                if (qry?.cols?.includes('estado')) a.estado1 = comprobante_estadosMap[a.estado]
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
        const data = await getComprobante(id)

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
            fecha_emision,
            doc_tipo,
            socio,
            pago_condicion,
            estado,
            // sub_total_ventas, anticipos, descuentos, valor_venta,
            // isc, igv, icbper, otros_cargos, otros_tributos,
            gravado,
            exonerado,
            inafecto,
            gratuito,
            descuentos,
            igv,
            isc,
            icbper,
            monto,
            nota,
            comprobante_items,
            transaccion1,
            pago_metodos,
        } = req.body
        let { transaccion } = req.body

        // --- VERIFY SI CAJA ESTÁ APERTURADA --- //
        const qry = {
            fltr: {
                estado: { op: 'Es', val: '1' },
                sucursal: { op: 'Es', val: req.sucursal.id },
                empresa: { op: 'Es', val: empresa },
            },
        }
        const caja_aperturas = await CajaAperturaRepository.find(qry, true)

        if (caja_aperturas.length == 0) {
            await transaction.rollback()
            res.json({ code: 1, msg: 'La caja no está aperturada, no puede generar comprobantes' })
            return
        }
        const caja_apertura = caja_aperturas[0]

        // --- VENTA DIRECTA (POS) --- //
        if (transaccion1.venta_canal == '4') {
            const sendT = {
                tipo: transaccion1.tipo,
                fecha: fecha_emision,
                socio,

                pago_condicion,
                monto,

                observacion,
                estado: 2,

                venta_codigo: transaccion1.venta_codigo,
                venta_canal: transaccion1.venta_canal,
                venta_facturado: pago_condicion == 1 ? true : false,
                venta_entregado: true,

                caja_apertura: caja_apertura.id,
                sucursal: req.sucursal.id,
                empresa,
                createdBy: colaborador,
            }

            const newTransaccion = await TransaccionRepository.create(sendT, transaction)
            transaccion = newTransaccion.id

            const itemsT = []
            for (const a of comprobante_items) {
                randomId = crypto.randomUUID()
                a.id = randomId
                a.id1 = randomId

                const send = {
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
                    venta_entregado: a.cantidad,

                    transaccion,
                    sucursal: req.sucursal.id,
                    empresa,
                    createdBy: colaborador,
                }

                itemsT.push(send)
            }

            await TransaccionItemRepository.createBulk(itemsT, transaction)
        }

        // --- CORRELATIVO COMPROBANTE --- //
        const comprobante_tipo = await ComprobanteTipoRepository.find({ id: doc_tipo }, true)

        if (comprobante_tipo == null) {
            await transaction.rollback()
            res.json({ code: 1, msg: 'No existe el tipo de comprobante' })
            return
        }

        if (comprobante_tipo.correlativo == null) {
            await transaction.rollback()
            res.json({ code: 1, msg: 'El tipo de comprobante aún no está configurado' })
            return
        }

        // --- CLIENTE DATOS --- //
        let cliente = {}
        if (socio == `${req.empresa.subdominio}-CLIENTES-VARIOS`) {
            cliente = {
                doc_tipo: '0',
                doc_numero: '00000000',
                doc_nombres: '00000000 - CLIENTES VARIOS',
                nombres: 'CLIENTES VARIOS',
            }
        } else {
            cliente = await SocioRepository.find({ id: socio }, true)
        }

        // --- CREAR --- //
        const send = {
            socio,
            pago_condicion,
            transaccion,
            caja_apertura: caja_apertura.id,
            estado,

            empresa_datos: {
                ruc: req.empresa.ruc,
                razon_social: req.empresa.razon_social,
                nombre_comercial: req.empresa.nombre_comercial,
                telefono: req.empresa.telefono,
                domicilio_fiscal: req.empresa.domicilio_fiscal,
                ubigeo: req.empresa.ubigeo,
                distrito: req.empresa.distrito,
                provincia: req.empresa.provincia,
                departamento: req.empresa.departamento,
                anexo: '0000',
            },

            cliente_datos: {
                razon_social_nombres: cliente.nombres,
                doc_numero: cliente.doc_numero,
                doc_tipo: cliente.doc_tipo,
                direccion: cliente.direccion,
            },

            doc_tipo,
            serie: comprobante_tipo.serie,
            numero: comprobante_tipo.correlativo,
            fecha_emision,
            hora_emision: dayjs().format('HH:mm:ss'),
            fecha_vencimiento: null,
            tipo_operacion_sunat: '0101',
            moneda: 'PEN',

            // sub_total_ventas,
            // anticipos,
            // descuentos,
            // valor_venta,
            // isc,
            // igv,
            // icbper,
            // otros_cargos,
            // otros_tributos,

            gravado,
            exonerado,
            inafecto,
            gratuito,
            descuentos,
            igv,
            isc,
            icbper,

            monto,
            nota,
            mifact: {},

            sucursal: req.sucursal.id,
            empresa,
            createdBy: colaborador,
        }

        const nuevo = await ComprobanteRepository.create(send, transaction)

        // --- GUARDAR ITEMS --- //
        const items = []
        let i = 1
        for (const a of comprobante_items) {
            items.push({
                articulo: a.articulo,
                descripcion: a.nombre,
                codigo: `P00${i}`,
                codigo_sunat: null,
                unidad: a.unidad,
                cantidad: a.cantidad,

                pu: a.pu,
                descuento_tipo: a.descuento_tipo,
                descuento_valor: a.descuento_valor,

                igv_afectacion: a.igv_afectacion,
                igv_porcentaje: a.igv_porcentaje,
                isc_porcentaje: a.isc_porcentaje,
                isc_monto_fijo_uni: a.isc_monto_fijo_uni,
                has_bolsa_tax: a.has_bolsa_tax,

                // --- mifact --- //
                // PRC_VTA_UNIT_ITEM: a.PRC_VTA_UNIT_ITEM,
                // VAL_UNIT_ITEM: a.VAL_UNIT_ITEM,
                // VAL_VTA_ITEM: a.VAL_VTA_ITEM,
                // MNT_BRUTO: a.MNT_BRUTO,
                // MNT_PV_ITEM: a.MNT_PV_ITEM,

                // COD_TIP_PRC_VTA: a.COD_TIP_PRC_VTA,
                // COD_TRIB_IGV_ITEM: a.COD_TRIB_IGV_ITEM,
                // POR_IGV_ITEM: a.POR_IGV_ITEM,
                // MNT_IGV_ITEM: a.MNT_IGV_ITEM,

                // MNT_DSCTO_ITEM: a.MNT_DSCTO_ITEM,
                // COD_TIP_SIST_ISC: a.COD_TIP_SIST_ISC,
                // MNT_ISC_ITEM: a.MNT_ISC_ITEM,
                // POR_ISC_ITEM: a.POR_ISC_ITEM,
                // IMPUESTO_BOLSAS_UNIT: a.IMPUESTO_BOLSAS_UNIT,

                comprobante: nuevo.id,
                sucursal: req.sucursal.id,
                empresa,
                createdBy: colaborador,
            })

            i++
        }
        send.items = items
        await ComprobanteItemRepository.createBulk(items, transaction)

        // --- CREAR MIFACT --- //
        let res_mifact
        if (false) {
            // if (doc_tipo.includes('01') || doc_tipo.includes('03')) {
            res_mifact = await sendDoc(send)
            if (res_mifact.errors && res_mifact.errors != '') {
                await transaction.rollback()
                res.json({
                    code: 1,
                    msg: 'Problemas al emitir comprobante, verifique datos',
                    data: res_mifact,
                })
                return
            }

            // --- ACTUALIZAR RESPUESTA SUNAT --- //
            await ComprobanteRepository.update(
                { id: nuevo.id },
                {
                    hash: res_mifact.codigo_hash,
                    estado: res_mifact.sunat_responsecode == 0 ? 3 : 2,
                    sunat_respuesta_codigo: res_mifact.sunat_responsecode,
                    sunat_respuesta_nota: res_mifact.sunat_note,
                    sunat_respuesta_descripcion: res_mifact.sunat_description,
                },
                transaction,
            )
        } else {
            await ComprobanteRepository.update(
                { id: nuevo.id },
                {
                    estado: 3,
                },
                transaction,
            )
        }

        // --- ACTUALIZAR CORRELATIVO --- //
        await ComprobanteTipoRepository.update(
            { id: doc_tipo },
            { correlativo: comprobante_tipo.correlativo + 1 },
            transaction,
        )

        // --- GUARDAR KARDEX --- //
        const kardexItems = []
        const articulosRecetasIds = []
        for (const a of comprobante_items) {
            if (a.is_combo == true) {
                for (const b of a.combo_articulos) {
                    if (b.articulo1.has_receta) {
                        articulosRecetasIds.push(b.articulo)
                    }
                }
            } else {
                if (a.has_receta == true) {
                    articulosRecetasIds.push(a.articulo)
                }
            }
        }
        const qry1 = {
            fltr: { id: { op: 'Es', val: articulosRecetasIds } },
            incl: ['receta_insumos'],
        }
        const articulosRecetas = await ArticuloRepository.find(qry1, true)
        const articulosRecetasMap = articulosRecetas.reduce((obj, a) => ((obj[a.id] = a), obj), {})

        for (const a of comprobante_items) {
            if (a.is_combo == true) {
                for (const b of a.combo_articulos) {
                    if (b.articulo1.has_receta) {
                        const receta = articulosRecetasMap[b.articulo].receta_insumos
                        for (const c of receta) {
                            kardexItems.push({
                                tipo: 2,
                                fecha: fecha_emision,

                                articulo: c.articulo,
                                cantidad: c.cantidad * b.cantidad * a.cantidad,

                                transaccion,
                                transaccion_item: a.id1,
                                comprobante: nuevo.id,

                                sucursal: req.sucursal.id,
                                empresa,
                                createdBy: colaborador,
                            })
                        }
                    } else {
                        kardexItems.push({
                            tipo: 2,
                            fecha: fecha_emision,

                            articulo: b.articulo,
                            cantidad: b.cantidad * a.cantidad,

                            transaccion,
                            transaccion_item: a.id1,
                            comprobante: nuevo.id,

                            sucursal: req.sucursal.id,
                            empresa,
                            createdBy: colaborador,
                        })
                    }
                }
            } else {
                if (a.has_receta == true) {
                    const receta = articulosRecetasMap[a.articulo].receta_insumos
                    for (const b of receta) {
                        kardexItems.push({
                            tipo: 2,
                            fecha: fecha_emision,

                            articulo: b.articulo,
                            cantidad: b.cantidad * a.cantidad,

                            transaccion,
                            transaccion_item: a.id1,
                            comprobante: nuevo.id,

                            sucursal: req.sucursal.id,
                            empresa,
                            createdBy: colaborador,
                        })
                    }
                } else {
                    kardexItems.push({
                        tipo: 2,
                        fecha: fecha_emision,

                        articulo: a.articulo,
                        cantidad: a.cantidad,

                        transaccion,
                        transaccion_item: a.id1,
                        comprobante: nuevo.id,

                        sucursal: req.sucursal.id,
                        empresa,
                        createdBy: colaborador,
                    })
                }
            }
        }
        await KardexRepository.createBulk(kardexItems, transaction)

        // --- ACTUALIZAR STOCK --- //
        if (kardexItems.length > 0) {
            const toUpdateMap = {}

            for (const a of kardexItems) {
                toUpdateMap[a.articulo] = (toUpdateMap[a.articulo] || 0) + Number(a.cantidad)
            }

            const itemsToUpdate = Object.entries(toUpdateMap).map(([articulo, cantidad]) => ({
                articulo,
                cantidad,
            }))

            await TransaccionControler.actualizarStock(
                req.sucursal.id,
                itemsToUpdate,
                2,
                transaction,
            )
        }

        // --- ACTUALIZAR PEDIDO ITEMS --- //
        if (transaccion1.venta_canal != '4') {
            const acumulado = {}

            for (const a of comprobante_items) {
                acumulado[a.id1] = (acumulado[a.id1] || 0) + Number(a.cantidad)
            }

            const cases = Object.entries(acumulado)
                .map(([id, cant]) => `WHEN '${id}' THEN ${cant}`)
                .join(' ')

            const ids = Object.keys(acumulado)
                .map((id) => `'${id}'`)
                .join(',')

            await sequelize.query(
                `
                    UPDATE transaccion_items
                    SET venta_entregado = COALESCE(venta_entregado, 0) + CASE id
                        ${cases}
                        ELSE 0
                    END
                    WHERE id IN (${ids})
                        AND transaccion = '${transaccion}'
                `,
                { transaction },
            )
        }

        // --- GUARDAR PAGOS --- //
        if (pago_condicion == 1) {
            const pagoItems = pago_metodos
                .filter((a) => a.monto > 0)
                .map((a) => ({
                    fecha: fecha_emision,
                    tipo: 1,
                    operacion: 1,
                    detalle: null,

                    pago_metodo: a.id,
                    monto: a.monto,

                    comprobante: nuevo.id,
                    caja_apertura: caja_apertura.id,

                    sucursal: req.sucursal.id,
                    empresa,
                    createdBy: colaborador,
                }))
            await DineroMovimientoRepository.createBulk(pagoItems, transaction)
        }

        await transaction.commit()

        // --- ACTUALIZAR PEDIDO SI SE ENTREGÓ TODO --- //
        if (transaccion1.venta_canal != '4') {
            const qry2 = {
                cols: ['venta_entregado', 'cantidad'],
                fltr: { transaccion: { op: 'Es', val: transaccion } },
            }
            const pedido_items = await TransaccionItemRepository.find(qry2, true)

            const is_pendiente = pedido_items.some((a) => a.venta_entregado < a.cantidad)
            if (is_pendiente == false) {
                const send = { venta_facturado: true }

                // --- Si es mesa --- //
                if (transaccion1.venta_canal == 1) {
                    send.venta_entregado = true
                    send.estado = 2
                }

                await TransaccionRepository.update({ id: transaccion }, send)
            }
        }

        // --- DEVOLVER --- //
        const data = await getComprobante(nuevo.id)
        const data_transaccion = await loadOneTransaccion(transaccion)

        res.json({ code: 0, data, facturacion: res_mifact, data_transaccion })
    } catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const getPdf = async (req, res) => {
    try {
        const { empresa } = req.user
        const { id } = req.params

        const data = await getComprobante(id)
        const buffer = await makePdf(data, req.empresa)

        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `inline; filename=${data.serie}-${data.numero}.pdf`)
        res.send(buffer)
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const sendMail = async (req, res) => {
    try {
        const { id, email_to_send } = req.body

        const data = await getComprobante(id)
        const buffer = await makePdf(data, req.empresa)
        const comprobante_numero = `${data.serie}-${data.numero}`
        const empresa_nombre = data.empresa_datos.razon_social
        const html = comprobanteHtml(comprobante_numero, empresa_nombre)

        const resend = new Resend(config.resendApiKey)
        const result = resend.emails.send({
            from: 'DivergeRest Invoices <invoices@divergerest.com>',
            to: email_to_send,
            subject: `Comprobante de pago ${comprobante_numero}`,
            html,
            attachments: [
                {
                    filename: `${comprobante_numero}.pdf`,
                    content: buffer.toString('base64'),
                    encoding: 'base64',
                },
            ],
        })

        if (result.error) {
            console.error('Error al enviar email:', result.error)
            return res
                .status(500)
                .json({ code: 1, msg: 'No se pudo enviar el correo', error: result.error })
        } else {
            res.json({ code: 0 })
        }
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const actualizarPago = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador, empresa } = req.user
        const { id } = req.params
        const { fecha_emision, caja_apertura, pago_metodos, modal_mode } = req.body

        let caja_apertura1
        if (modal_mode == 1) {
            // --- VERIFY SI CAJA ESTÁ APERTURADA --- //
            const qry = {
                fltr: { estado: { op: 'Es', val: '1' }, empresa: { op: 'Es', val: empresa } },
            }
            const caja_apertura = await CajaAperturaRepository.find(qry, true)

            if (caja_apertura.length == 0) {
                await transaction.rollback()
                res.json({
                    code: 1,
                    msg: 'La caja no está aperturada, no puede generar comprobantes',
                })
                return
            }

            caja_apertura1 = caja_apertura[0]
        }

        if (modal_mode == 2) {
            // --- ELIMINAR PAGOS ANTERIORES --- //
            await DineroMovimientoRepository.delete({ comprobante: id }, transaction)
        }

        // --- GUARDAR PAGOS --- //
        const pagoItems = pago_metodos
            .filter((a) => a.monto > 0)
            .map((a) => ({
                fecha: modal_mode == 1 ? caja_apertura1.fecha_apertura : fecha_emision,
                tipo: 1,
                operacion: 1,
                detalle: null,

                pago_metodo: a.id,
                monto: a.monto,

                comprobante: id,
                caja_apertura: modal_mode == 1 ? caja_apertura1.id : caja_apertura,

                sucursal: req.sucursal.id,
                empresa,
                createdBy: colaborador,
            }))
        await DineroMovimientoRepository.createBulk(pagoItems, transaction)

        await transaction.commit()

        res.json({ code: 0 })
    } catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const anular = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador } = req.user
        const { id } = req.params
        const { item, anulado_motivo } = req.body

        // --- ANULAR MIFACT --- //
        let res_mifact
        if (false) {
            // if (doc_tipo.includes('01') || doc_tipo.includes('03')) {
            res_mifact = await anularDoc(item)
            if (res_mifact.errors && res_mifact.errors != '') {
                await transaction.rollback()
                res.json({ code: 1, msg: 'No se pudo anular el comprobante', data: res_mifact })
                return
            }
        }

        // --- ANULAR --- //
        await ComprobanteRepository.update(
            { id },
            {
                estado: 0,
                anulado_motivo,
                updatedBy: colaborador,
            },
            transaction,
        )

        // --- ANULAR PAGOS --- //
        await DineroMovimientoRepository.update(
            { comprobante: id },
            {
                estado: 0,
                updatedBy: colaborador,
            },
            transaction,
        )

        await transaction.commit()

        res.json({ code: 0, data: res_mifact })
    } catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const canjear = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador, empresa } = req.user
        const { id } = req.params
        const { fecha_emision, doc_tipo, doc_tipo_nuevo, socio } = req.body

        const qry = {
            fltr: { id: { op: 'Es', val: id } },
            cols: { exclude: [] },
            incl: ['comprobante_items'],
            iccl: {
                comprobante_items: {
                    cols: { exclude: [] },
                },
            },
        }

        const comprobantes = await ComprobanteRepository.find(qry, true)
        const comprobante = comprobantes[0]

        // --- ANULAR MIFACT --- //
        let res1_mifact
        if (false) {
            // if (doc_tipo.includes('01') || doc_tipo.includes('03')) {
            res1_mifact = await anularDoc(comprobante)
            if (res1_mifact.errors && res1_mifact.errors != '') {
                await transaction.rollback()
                res.json({ code: 1, msg: 'No se pudo anular el comprobante', data: res1_mifact })
                return
            }
        }

        // --- CREAR NUEVO COMPROBANTE --- //
        const cliente = await SocioRepository.find({ id: socio }, true)
        const comprobante_tipo = await ComprobanteTipoRepository.find({ id: doc_tipo_nuevo }, true)

        const send = {
            socio,
            pago_condicion: comprobante.pago_condicion,
            transaccion: comprobante.transaccion,
            caja_apertura: comprobante.caja_apertura,
            estado: 1,

            empresa_datos: comprobante.empresa_datos,

            cliente_datos: {
                razon_social_nombres: cliente.nombres,
                doc_numero: cliente.doc_numero,
                doc_tipo: cliente.doc_tipo,
                direccion: cliente.direccion,
            },

            doc_tipo: doc_tipo_nuevo,
            serie: comprobante_tipo.serie,
            numero: comprobante_tipo.correlativo,
            fecha_emision,
            hora_emision: dayjs().format('HH:mm:ss'),
            fecha_vencimiento: null,
            tipo_operacion_sunat: '0101',
            moneda: comprobante.moneda,

            gravado: comprobante.gravado,
            exonerado: comprobante.exonerado,
            inafecto: comprobante.inafecto,
            gratuito: comprobante.gratuito,
            descuentos: comprobante.descuentos,
            igv: comprobante.igv,
            isc: comprobante.isc,
            icbper: comprobante.icbper,

            monto: comprobante.monto,
            nota: comprobante.nota,
            mifact: {},

            sucursal: comprobante.sucursal,
            empresa,
            createdBy: colaborador,
        }
        const nuevo = await ComprobanteRepository.create(send, transaction)

        // --- GUARDAR ITEMS --- //
        const items = []
        for (const a of comprobante.comprobante_items) {
            items.push({
                articulo: a.articulo,
                descripcion: a.descripcion,
                codigo: a.codigo,
                codigo_sunat: a.codigo_sunat,
                unidad: a.unidad,
                cantidad: a.cantidad,

                pu: a.pu,
                descuento_tipo: a.descuento_tipo,
                descuento_valor: a.descuento_valor,

                igv_afectacion: a.igv_afectacion,
                igv_porcentaje: a.igv_porcentaje,
                isc_porcentaje: a.isc_porcentaje,
                isc_monto_fijo_uni: a.isc_monto_fijo_uni,
                has_bolsa_tax: a.has_bolsa_tax,

                // --- mifact --- //
                // PRC_VTA_UNIT_ITEM: a.PRC_VTA_UNIT_ITEM,
                // VAL_UNIT_ITEM: a.VAL_UNIT_ITEM,
                // VAL_VTA_ITEM: a.VAL_VTA_ITEM,
                // MNT_BRUTO: a.MNT_BRUTO,
                // MNT_PV_ITEM: a.MNT_PV_ITEM,

                // COD_TIP_PRC_VTA: a.COD_TIP_PRC_VTA,
                // COD_TRIB_IGV_ITEM: a.COD_TRIB_IGV_ITEM,
                // POR_IGV_ITEM: a.POR_IGV_ITEM,
                // MNT_IGV_ITEM: a.MNT_IGV_ITEM,

                // MNT_DSCTO_ITEM: a.MNT_DSCTO_ITEM,
                // COD_TIP_SIST_ISC: a.COD_TIP_SIST_ISC,
                // MNT_ISC_ITEM: a.MNT_ISC_ITEM,
                // POR_ISC_ITEM: a.POR_ISC_ITEM,
                // IMPUESTO_BOLSAS_UNIT: a.IMPUESTO_BOLSAS_UNIT,

                comprobante: nuevo.id,
                sucursal: a.sucursal,
                empresa,
                createdBy: colaborador,
            })
        }
        send.items = items
        await ComprobanteItemRepository.createBulk(items, transaction)

        // --- CREAR MIFACT --- //
        let res_mifact
        if (false) {
            // if (doc_tipo.includes('01') || doc_tipo.includes('03')) {
            res_mifact = await sendDoc(send)
            if (res_mifact.errors && res_mifact.errors != '') {
                await transaction.rollback()
                res.json({
                    code: 1,
                    msg: 'Problemas al emitir comprobante, verifique datos',
                    data: res_mifact,
                })
                return
            }

            // --- ACTUALIZAR RESPUESTA SUNAT --- //
            await ComprobanteRepository.update(
                { id: nuevo.id },
                {
                    hash: res_mifact.codigo_hash,
                    estado: res_mifact.sunat_responsecode == 0 ? 3 : 2,
                    sunat_respuesta_codigo: res_mifact.sunat_responsecode,
                    sunat_respuesta_nota: res_mifact.sunat_note,
                    sunat_respuesta_descripcion: res_mifact.sunat_description,
                },
                transaction,
            )
        } else {
            await ComprobanteRepository.update({ id: nuevo.id }, { estado: 3 }, transaction)
        }

        // --- ACTUALIZAR CORRELATIVO --- //
        await ComprobanteTipoRepository.update(
            { id: doc_tipo_nuevo },
            { correlativo: comprobante_tipo.correlativo + 1 },
            transaction,
        )

        // --- ACTUALIZAR ESTADO CANJEADO --- //
        await ComprobanteRepository.update(
            { id },
            {
                estado: 4,
                canjeado_por: nuevo.id,
                updatedBy: colaborador,
            },
            transaction,
        )

        // --- ACTUALIZAR PAGOS --- //
        await DineroMovimientoRepository.update(
            { comprobante: id },
            {
                comprobante: nuevo.id,
                updatedBy: colaborador,
            },
            transaction,
        )

        await transaction.commit()

        res.json({ code: 0, new: res_mifact, past: res1_mifact })
    } catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const resumen = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        const qry1 = {
            cols: [
                'id',
                'fecha_emision',
                'doc_tipo',
                'serie',
                'numero',
                'serie_correlativo',
                'monto',
                'pago_condicion',
                'estado',
            ],
            ordr: [['createdAt', 'ASC']],
            incl: ['doc_tipo1', 'comprobante_items', 'transaccion1', 'dinero_movimientos'],
            iccl: {
                componente_items: {
                    cols: [
                        'id',
                        'articulo',
                        'descripcion',
                        'pu',
                        'descuento_tipo',
                        'descuento_valor',
                        'cantidad',
                    ],
                },
                transaccion1: {
                    cols: ['venta_canal'],
                },
                dinero_movimientos: {
                    incl: ['pago_metodo1'],
                },
            },
            fltr: { empresa: { op: 'Es', val: empresa } },
        }

        if (qry) Object.assign(qry1.fltr, qry.fltr)

        const comprobantes = await ComprobanteRepository.find(qry1, true)

        const ventas = {
            tiempo: {},
            pago_metodos: [],
            comprobante_tipos: [],
            canales: [],
            productos: [],
            total: 0,
            descuentos: 0,
        }

        const anulados = {
            total: 0,
            descuentos: 0,
        }

        const comprobante_tiposMap = arrayMap('comprobante_tipos')
        const venta_canalesMap = arrayMap('venta_canales')

        // --- INDICES AUXILIARES --- //
        const pagoMetodosMap = {}
        const comprobanteTiposMap = {}
        const canalesMap = {}
        const productosMap = {}
        const mesesMap = {}
        const pedidosMap = {}

        for (const a of comprobantes) {
            // --- ACEPTADOS --- //
            if (['1', '2', '3'].includes(a.estado)) {
                ventas.total += Number(a.monto)

                // --- MÉTODOS DE PAGO --- //
                for (const b of a.dinero_movimientos) {
                    const mkey = b.pago_metodo
                    if (!pagoMetodosMap[mkey]) {
                        const item = {
                            id: mkey,
                            name: b.pago_metodo1.nombre,
                            value: Number(b.monto),
                            itemStyle: { color: b.pago_metodo1.color },
                        }
                        ventas.pago_metodos.push(item)
                        pagoMetodosMap[mkey] = item
                    } else {
                        pagoMetodosMap[mkey].value += Number(b.monto)
                    }
                }

                // --- TIPOS DE COMPROBANTES --- //
                const comp_tipo = comprobante_tiposMap[a.doc_tipo1.tipo]
                if (!comprobanteTiposMap[comp_tipo.id]) {
                    const item = {
                        id: comp_tipo.id,
                        name: comp_tipo.nombre,
                        value: Number(a.monto),
                    }
                    ventas.comprobante_tipos.push(item)
                    comprobanteTiposMap[comp_tipo.id] = item
                } else {
                    comprobanteTiposMap[comp_tipo.id].value += Number(a.monto)
                }

                // --- CANALES --- //
                const cKey = a.transaccion1.venta_canal
                if (!canalesMap[cKey]) {
                    const item = {
                        id: cKey,
                        name: venta_canalesMap[cKey].nombre,
                        value: Number(a.monto),
                        cantidad: 0,
                    }
                    ventas.canales.push(item)
                    canalesMap[cKey] = item
                } else {
                    canalesMap[cKey].value += Number(a.monto)
                }

                if (!pedidosMap[a.transaccion1.id]) {
                    pedidosMap[a.transaccion1.id] = a.transaccion1
                    canalesMap[cKey].cantidad += 1
                }

                // --- PRODUCTOS --- //
                for (const b of a.comprobante_items) {
                    const prd = calcularUno({
                        pu: Number(b.pu),
                        descuento_tipo: b.descuento_tipo,
                        descuento_valor: b.descuento_valor,
                        cantidad: Number(b.cantidad),
                    })

                    ventas.descuentos += prd.descuento
                    const pKey = b.articulo

                    if (!productosMap[pKey]) {
                        const item = {
                            id: b.articulo,
                            nombre: b.descripcion,
                            cantidad: Number(b.cantidad),
                            monto: Number(prd.total),
                            descuento: prd.descuento == 0 ? null : prd.descuento,
                        }
                        ventas.productos.push(item)
                        productosMap[pKey] = item
                    } else {
                        productosMap[pKey].cantidad += Number(b.cantidad)
                        productosMap[pKey].monto += Number(prd.total)
                        productosMap[pKey].descuento += prd.descuento == 0 ? null : prd.descuento
                    }
                }

                // --- TIEMPO --- //
                const mes = dayjs(a.fecha_emision).format('YYYY-MMM')
                if (!mesesMap[mes]) mesesMap[mes] = 0
                mesesMap[mes] += Number(a.monto)
            }

            // --- ANULADOS --- //
            if (a.estado == 0) {
                anulados.total += Number(a.monto)

                for (const b of a.comprobante_items) {
                    const prd = calcularUno({
                        pu: Number(b.pu),
                        descuento_tipo: b.descuento_tipo,
                        descuento_valor: b.descuento_valor,
                        cantidad: Number(b.cantidad),
                    })
                    anulados.descuentos += prd.descuento
                }
            }
        }

        ventas.tiempo = {
            meses: Object.keys(mesesMap),
            ventas: Object.values(mesesMap),
        }

        ventas.productos = ventas.productos.sort((a, b) => b.monto - a.monto)

        const data = {
            ventas,
            anulados,
            general: ventas.total + anulados.total + ventas.descuentos + anulados.descuentos,
        }

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

// --- Helpers --- //
async function getComprobante(id) {
    const qry = {
        id,
        incl: ['doc_tipo1', 'comprobante_items', 'dinero_movimientos'],
        iccl: {
            dinero_movimientos: {
                incl: ['pago_metodo1'],
            },
            comprobante_items: {
                cols: { exclude: [] },
            },
        },
    }
    const data = await ComprobanteRepository.find(qry, true)

    const qry1 = {
        id: data.transaccion,
        cols: ['venta_canal', 'venta_mesa', 'venta_socio_datos'],
        incl: ['venta_mesa1'],
        iccl: {
            venta_mesa1: {
                incl: ['salon1'],
            },
        },
    }
    data.transaccion1 = await TransaccionRepository.find(qry1, true)

    if (data) {
        const documentos_identidadMap = arrayMap('documentos_identidad')
        const pago_condicionesMap = arrayMap('pago_condiciones')
        const venta_canalesMap = arrayMap('venta_canales')
        const comprobante_estadosMap = arrayMap('comprobante_estados')

        data.cliente_datos.doc_tipo1 = documentos_identidadMap[data.cliente_datos.doc_tipo]
        data.pago_condicion1 = pago_condicionesMap[data.pago_condicion]
        data.venta_canal1 = venta_canalesMap[data.transaccion1.venta_canal]
        data.estado1 = comprobante_estadosMap[data.estado]

        data.total_letras = numeroATexto(data.monto)
        data.qr_string = `${data.empresa_datos.ruc}|${data.doc_tipo1.tipo}|${data.serie}|${data.numero}|${data.igv}|${data.monto}|${data.fecha_emision}|${data.cliente_datos.doc_tipo}|${data.cliente_datos.doc_numero}`

        data.moneda1 = {
            plural: 'SOLES',
            singular: 'SOL',
        }
    }

    return data
}

async function getImageBase64(url) {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`No se pudo obtener la imagen: ${response.status}`)

    const contentType = response.headers.get('content-type') || 'image/png' // usa el tipo real
    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    return `data:${contentType};base64,${base64}`
}

async function makePdf(doc, empresa) {
    // --- LOGO --- //
    const logoBase64 = await getImageBase64(empresa.foto.url)

    // --- TABLE ITEMS --- //
    const dataRows = doc.comprobante_items.map((p) => [
        { text: p.descripcion, style: 'tableItem', noWrap: false }, // permite saltos de línea
        { text: p.cantidad, style: 'tableItem', alignment: 'right' },
        { text: p.pu, style: 'tableItem', alignment: 'right' },
        {
            text: (p.cantidad * p.pu).toFixed(2),
            style: 'tableItem',
            alignment: 'right',
        },
    ])

    // --- TIPO DE ATENCIÓN --- //
    if (doc.transaccion1.venta_canal == 1) {
        doc.atencion = `${doc.transaccion1.venta_mesa1.salon1.nombre} - ${doc.transaccion1.venta_mesa1.nombre}`
    } else {
        doc.atencion = doc.venta_canal1.nombre
    }

    // --- PAGOS --- //
    const totalPagado = doc.dinero_movimientos.reduce((acc, p) => acc + Number(p.monto), 0)
    doc.vuelto = totalPagado - Number(doc.monto)
    const pagosStack =
        doc.dinero_movimientos.length > 0
            ? {
                  stack: [
                      ...doc.dinero_movimientos.map((p) => ({
                          text: `${p.pago_metodo1.nombre}: ${p.monto}`,
                          style: 'datosExtra',
                      })),
                      { text: `VUELTO: ${doc.vuelto.toFixed(2)}`, style: 'datosExtra' },
                  ],
              }
            : null

    // --- PARA DELIVERY --- //
    const deliveryStack =
        doc.transaccion1.venta_tipo == 3
            ? {
                  stack: [
                      {
                          text: `TELEFONO: ${doc.transaccion1.venta_socio_datos.telefono || ''}`,
                          style: 'datosExtra',
                      },
                      {
                          text: `DIRECCIÓN: ${doc.transaccion1.venta_socio_datos.direccion || ''}`,
                          style: 'datosExtra',
                      },
                  ],
              }
            : null

    // --- QR --- //
    // "20100100100|01|F009|00000001|180.00|1180.00|2025-09-20|6|20601847834|IZVMmltTcKneNX1RyLO0zjlSqrk="
    const qrStack =
        doc.doc_tipo1.tipo == 'NV'
            ? null
            : {
                  qr: doc.qr_string,
                  fit: 115,
                  alignment: 'center',
                  margin: [0, 10, 0, 10],
              }

    // --- SUNAT --- //
    let sunatStack = null
    if (doc.doc_tipo1.tipo == '01') {
        sunatStack = {
            stack: [
                {
                    text: `Representacion impresa de la`,
                    style: 'empresa_style',
                },
                {
                    text: `FACTURA ELECTRÓNICA`,
                    style: 'empresa_style',
                },
                // {
                //     text: `${doc.hash}`,
                //     style: 'empresa_style',
                // },
            ],
        }
    } else if (doc.doc_tipo1.tipo == '03') {
        sunatStack = {
            stack: [
                {
                    text: `Representacion impresa de la`,
                    style: 'empresa_style',
                },
                {
                    text: `BOLETA DE VENTA ELECTRÓNICA`,
                    style: 'empresa_style',
                },
                // {
                //     text: `${doc.hash}`,
                //     style: 'empresa_style',
                // },
            ],
        }
    }

    // --- DEFINICIÓN DEL PDF --- //
    const docDefinition = {
        pageSize: {
            width: 80 * 2.83465,
            height: 'auto',
        },
        pageMargins: [5, 5, 5, 5],
    }

    docDefinition.content = [
        // --- LOGO --- //
        {
            image: logoBase64, // el logo en base64
            fit: [65 * 2.83465, 45 * 2.83465], // ajusta tamaño
            alignment: 'center', // opcional (left, center, right)
            margin: [0, 0, 0, 10],
        },
        // --- EMPRESA --- //
        {
            stack: [
                doc.empresa_datos.razon_social,
                `RUC: ${doc.empresa_datos.ruc}`,
                doc.empresa_datos.domicilio_fiscal,
                `TEL: ${doc.empresa_datos.telefono}`,
            ],
            style: 'empresa_style',
        },
        // --- TIPO DE DOCUMENTO --- //
        {
            stack: [
                `${doc.doc_tipo1.tipo1.nombre}${doc.doc_tipo1.tipo == 'NV' ? '' : ' ELECTRÓNICA'}`,
                `${doc.serie}-${doc.numero}`,
            ],
            style: 'tipo_doc',
        },
        // --- CLIENTE --- //
        {
            stack: [
                {
                    text: `FECHA DE EMISIÓN: ${dayjs(doc.createdAt).tz().format('DD-MM-YYYY HH:mm')}`,
                    style: 'datosExtra',
                },
                { text: `ATENCIÓN: ${doc.atencion}`, style: 'datosExtra' },
                {
                    text: `CLIENTE: ${doc.cliente_datos.razon_social_nombres}`,
                    style: 'datosExtra',
                },
                {
                    text: `${doc.cliente_datos.doc_tipo == 0 ? 'DNI' : doc.cliente_datos.doc_tipo1.nombre}: ${doc.cliente_datos.doc_numero}`,
                    style: 'datosExtra',
                },
                {
                    text: `DIRECCIÓN: ${doc.cliente_datos.direccion || ''}`,
                    style: 'datosExtra',
                },
            ],
            style: 'cliente_datos',
        },
        // --- TABLA --- //
        {
            table: {
                widths: ['*', 'auto', 'auto', 'auto'], // se adapta a todo el ancho
                body: [
                    [
                        { text: 'PRODUCTO', style: 'tableHeader' },
                        { text: 'CANT.', style: 'tableHeader', alignment: 'right' },
                        { text: 'P.U.', style: 'tableHeader', alignment: 'right' },
                        { text: 'IMP.', style: 'tableHeader', alignment: 'right' },
                    ],
                    ...dataRows,
                ],
            },
            layout: {
                hLineWidth: function (i, node) {
                    if (i === 1 || i === node.table.body.length) {
                        return 1 // grosor de la línea
                    }
                    return 0 // sin líneas intermedias
                },
                vLineWidth: function () {
                    return 0 // sin líneas verticales
                },
                hLineColor: function () {
                    return '#000' // color de las líneas
                },
            },
        },
        // --- TOTALES --- //
        // {
        //     stack: [
        //         {
        //             columns: [
        //                 { text: 'Sub total ventas:', style: 'totalesLabel' },
        //                 { text: doc.sub_total_ventas, style: 'totalesValue' },
        //             ],
        //         },
        //         // {
        //         //     columns: [
        //         //         { text: 'Anticipos:', style: 'totalesLabel' },
        //         //         { text: doc.anticipos, style: 'totalesValue' },
        //         //     ],
        //         // },
        //         {
        //             columns: [
        //                 { text: 'Descuentos:', style: 'totalesLabel' },
        //                 { text: doc.descuentos, style: 'totalesValue' },
        //             ],
        //         },
        //         {
        //             columns: [
        //                 { text: 'Valor venta:', style: 'totalesLabel' },
        //                 { text: doc.valor_venta, style: 'totalesValue' },
        //             ],
        //         },
        //         // {
        //         //     columns: [
        //         //         { text: 'ISC:', style: 'totalesLabel' },
        //         //         { text: doc.isc, style: 'totalesValue' },
        //         //     ],
        //         // },
        //         {
        //             columns: [
        //                 { text: 'IGV:', style: 'totalesLabel' },
        //                 { text: doc.igv, style: 'totalesValue' },
        //             ],
        //         },
        //         // {
        //         //     columns: [
        //         //         { text: 'ICBPER:', style: 'totalesLabel' },
        //         //         { text: doc.icbper, style: 'totalesValue' },
        //         //     ],
        //         // },
        //         // {
        //         //     columns: [
        //         //         { text: 'Otros cargos:', style: 'totalesLabel' },
        //         //         { text: doc.otros_cargos, style: 'totalesValue' },
        //         //     ],
        //         // },
        //         // {
        //         //     columns: [
        //         //         { text: 'Otros tributos:', style: 'totalesLabel' },
        //         //         { text: doc.otros_tributos, style: 'totalesValue' },
        //         //     ],
        //         // },
        //         {
        //             columns: [
        //                 { text: 'IMPORTE TOTAL:', style: 'totalesLabel' },
        //                 { text: doc.monto, style: 'totalesValue' },
        //             ],
        //         },
        //     ],
        //     margin: [0, 10, 0, 10],
        // },
        {
            stack: [
                {
                    columns: [
                        { text: 'Ope. gravadas:', style: 'totalesLabel' },
                        { text: doc.gravado, style: 'totalesValue' },
                    ],
                },
                // {
                //     columns: [
                //         { text: 'Ope. exoneradas:', style: 'totalesLabel' },
                //         { text: doc.exonerado, style: 'totalesValue' },
                //     ],
                // },
                // {
                //     columns: [
                //         { text: 'Ope. inafectas:', style: 'totalesLabel' },
                //         { text: doc.inafecto, style: 'totalesValue' },
                //     ],
                // },
                {
                    columns: [
                        { text: 'Ope. gratuitas:', style: 'totalesLabel' },
                        { text: doc.gratuito, style: 'totalesValue' },
                    ],
                },
                {
                    columns: [
                        { text: 'Descuentos:', style: 'totalesLabel' },
                        { text: doc.descuentos, style: 'totalesValue' },
                    ],
                },
                {
                    columns: [
                        { text: 'IGV:', style: 'totalesLabel' },
                        { text: doc.igv, style: 'totalesValue' },
                    ],
                },
                // {
                //     columns: [
                //         { text: 'ISC:', style: 'totalesLabel' },
                //         { text: doc.isc, style: 'totalesValue' },
                //     ],
                // },
                // {
                //     columns: [
                //         { text: 'ICBPER:', style: 'totalesLabel' },
                //         { text: doc.icbper, style: 'totalesValue' },
                //     ],
                // },
                {
                    columns: [
                        { text: 'Importe total:', style: 'totalesLabel' },
                        { text: doc.monto, style: 'totalesValue' },
                    ],
                },
            ],
            margin: [0, 5, 0, 10],
        },
        // --- DATOS EXTRA --- //
        {
            stack: [
                { text: `SON: ${numeroATexto(doc.monto)} SOLES`, style: 'datosExtra' },
                {
                    text: `CONDICIÓN DE PAGO: ${doc.pago_condicion1.nombre}`,
                    style: 'datosExtra',
                },
            ],
        },
        // --- PAGOS --- //
        ...(pagosStack ? [pagosStack] : []),
        // --- DELIVERY --- //
        ...(deliveryStack ? [deliveryStack] : []),
        // --- QR --- //
        ...(qrStack ? [qrStack] : []),
        // --- SUNAT --- //
        ...(sunatStack ? [sunatStack] : []),
        {
            text: 'GRACIAS POR SU PREFERENCIA',
            style: 'empresa_style',
            fontSize: 8,
            margin: [0, 10, 0, 0],
        },
    ]

    docDefinition.styles = {
        empresa_style: { fontSize: 10, alignment: 'center' },
        tipo_doc: { fontSize: 11, alignment: 'center', bold: true, margin: [0, 10, 0, 10] },
        datosExtra: { fontSize: 10, margin: [0, 0, 0, 1] },
        cliente_datos: { fontSize: 10, alignment: 'left', margin: [0, 0, 0, 10] },
        tableHeader: { fontSize: 10, bold: true, margin: [0, 0, 0, 1] },
        tableItem: { fontSize: 10, margin: [0, 0, 0, 1] },
        totalesLabel: { fontSize: 10, margin: [0, 0, 0, 1] },
        totalesValue: { fontSize: 10, alignment: 'right', margin: [0, 0, 0, 1] },
    }

    const fonts = {
        Roboto: {
            normal: 'src/shared/fonts/Roboto-Regular.ttf',
            bold: 'src/shared/fonts/Roboto-Bold.ttf',
        },
    }

    return new Promise((resolve, reject) => {
        const printer = new PdfPrinter(fonts)
        const pdfDoc = printer.createPdfKitDocument(docDefinition)

        let chunks = []
        pdfDoc.on('data', (chunk) => chunks.push(chunk))
        pdfDoc.on('end', () => {
            const buffer = Buffer.concat(chunks)
            resolve(buffer)
        })
        pdfDoc.on('error', reject)
        pdfDoc.end()
    })
}

async function loadOneTransaccion(id) {
    try {
        const qry = {
            id,
            sqls: ['comprobantes_monto'],
            incl: ['socio1', 'createdBy1', 'venta_mesa1'],
            iccl: {
                venta_mesa1: {
                    incl: ['salon1'],
                },
            },
        }
        const data = await TransaccionRepository.find(qry, true)

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
    } catch (error) {
        console.log(error)
    }
}

function calcularUno(item) {
    if (item.descuento_tipo != null && item.descuento_valor != null && item.descuento_valor != 0) {
        if (item.descuento_tipo == 1) {
            item.pu_desc = item.descuento_valor
        } else if (item.descuento_tipo == 2) {
            item.pu_desc = item.cantidad * item.pu * (item.descuento_valor / 100)
        }
    } else {
        item.pu_desc = 0
    }

    item.descuento = item.pu_desc
    item.total = item.cantidad * item.pu - item.descuento

    return item
}

// --- Mifact --- //
const consultarEstado = async (req, res) => {
    try {
        const item = req.query.item ? JSON.parse(req.query.item) : null

        const res_mifact = await estadoDoc(item)

        res.json({ code: 0, mifact: res_mifact })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const downloadXml = async (req, res) => {
    try {
        const item = req.query.item ? JSON.parse(req.query.item) : null

        const res_mifact = await xmlDoc(item)

        if (res_mifact.code == 1) {
            res.json({ code: 1, msg: res_mifact.msg })
        } else {
            const { name, buffer } = res_mifact

            res.setHeader('Content-Type', 'application/xml')
            res.setHeader('Content-Disposition', `inline; filename=${name}`)
            res.send(buffer)
        }
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

export default {
    create,
    find,
    findById,
    getPdf,
    sendMail,
    downloadXml,
    actualizarPago,
    anular,
    canjear,
    resumen,

    consultarEstado,
}
