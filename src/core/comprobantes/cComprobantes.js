import sequelize from '#db/sequelize.js'
import { literal } from 'sequelize'
import { Comprobante, ComprobanteItem } from '#db/models/Comprobante.js'
import { Empresa } from '#db/models/Empresa.js'
import { Socio } from '#db/models/Socio.js'
import { ComprobanteTipo } from '#db/models/ComprobanteTipo.js'
import { Kardex } from '#db/models/Kardex.js'
import { Articulo } from '#db/models/Articulo.js'
import { Transaccion, TransaccionItem } from '#db/models/Transaccion.js'
import { Colaborador } from '#db/models/Colaborador.js'
import { CajaApertura } from '#db/models/CajaApertura.js'
import { DineroMovimiento } from "#db/models/DineroMovimiento.js"
import { Mesa } from '#db/models/Mesa.js'
import { Salon } from '#db/models/Salon.js'
import { PagoMetodo } from '#db/models/PagoMetodo.js'
import { applyFilters, numeroATexto } from '#shared/mine.js'
import { arrayMap } from '#store/system.js'
import dayjs from "dayjs"
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

import PdfPrinter from 'pdfmake'
import { pathXml, getFilePath } from '#shared/uploadFiles.js'
import fs from "fs"
import path from "path"

import config from '../../config.js'
import { Resend } from 'resend'
import { comprobanteHtml } from '#shared/layouts.js'

// import { crearXml } from '#shared/sunat/crearXml.js'
// import { firmarXml } from '#shared/sunat/firmarXml.js'
// import { enviarSunat } from '#shared/sunat/enviarSunat.js'
import { sendDoc, anularDoc, estadoDoc, xmlDoc, calculateInvoiceLineValues } from '#shared/sunat/mifact.js'


const include1 = {
    socio1: {
        model: Socio,
        as: 'socio1',
        attributes: ['id', 'nombres']
    },
    createdBy1: {
        model: Colaborador,
        as: 'createdBy1',
        attributes: ['id', 'nombres', 'apellidos', 'nombres_apellidos']
    },
    // pago_comprobante1: {
    //     model: ComprobanteTipo,
    //     as: 'pago_comprobante1',
    //     attributes: ['id', 'nombre']
    // },
    comprobante_items: {
        model: ComprobanteItem,
        as: 'comprobante_items',
    },
    transaccion1: {
        model: Transaccion,
        as: 'transaccion1',
        attributes: ['id', 'venta_codigo', 'venta_canal', 'venta_mesa'],
    },
    caja_apertura1: {
        model: CajaApertura,
        as: 'caja_apertura1',
        attributes: ['id', 'createdAt']
    },
}

const sqls1 = {
    pagos_monto: [
        literal(`(SELECT COALESCE(SUM(c.monto), 0) FROM dinero_movimientos AS c WHERE c.comprobante = "comprobantes"."id")`),
        "pagos_monto"
    ]
}

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault('America/Lima')

// --- Rutas --- //
const create = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador, empresa } = req.user
        const {
            fecha_emision, doc_tipo, socio, pago_condicion, estado,
            // sub_total_ventas, anticipos, descuentos, valor_venta,
            // isc, igv, icbper, otros_cargos, otros_tributos,
            gravado, exonerado, inafecto, gratuito, descuentos,
            igv, isc, icbper,
            monto, nota,
            comprobante_items, transaccion1, pago_metodos,
            comes_from,
        } = req.body
        let { transaccion } = req.body

        // --- VERIFY SI CAJA ESTÁ APERTURADA --- //
        const caja_apertura = await CajaApertura.findOne({
            where: {
                estado: '1',
                empresa: empresa.id,
            }
        })

        if (caja_apertura == null) {
            await transaction.rollback()
            res.json({ code: 1, msg: 'La caja no está aperturada' })
            return
        }

        // --- VENTA POS --- //
        // console.log(transaccion1)
        if (transaccion1.venta_canal == '4') {
            const sendT = {
                tipo: transaccion1.tipo,
                fecha: fecha_emision,
                socio,

                pago_condicion,
                monto,

                // observacion,
                estado: 2,
                // anulado_motivo,

                // compra_comprobante,
                // compra_comprobante_serie,
                // compra_comprobante_correlativo,

                venta_codigo: transaccion1.venta_codigo,
                venta_canal: transaccion1.venta_canal,
                // venta_mesa,
                // venta_pago_metodo,
                // venta_pago_con,
                // venta_socio_datos,
                venta_entregado: true,
                venta_facturado: pago_condicion == 1 ? true : false,

                empresa: empresa.id,
                createdBy: colaborador,
            }

            const newTransaccion = await Transaccion.create(sendT, { transaction })
            transaccion = newTransaccion.id

            const itemsT = comprobante_items.map(a => ({
                articulo: a.articulo,
                cantidad: a.cantidad,
                pu: a.pu,
                igv_afectacion: a.igv_afectacion,
                igv_porcentaje: a.igv_porcentaje,
                observacion: a.observacion,
                transaccion,
                has_receta: a.has_receta,
                receta_insumos: a.receta_insumos,
                is_combo: a.is_combo,
                combo_articulos: a.combo_articulos,
                venta_entregado: a.cantidad,

                empresa: empresa.id,
                createdBy: colaborador
            }))

            await TransaccionItem.bulkCreate(itemsT, { transaction })
        }

        // --- CORRELATIVO COMPROBANTE --- //
        const pago_comprobante = await ComprobanteTipo.findByPk(doc_tipo)

        if (pago_comprobante == null) {
            await transaction.rollback()
            res.json({ code: 1, msg: 'No existe el tipo de comprobante' })
            return
        }

        if (pago_comprobante.correlativo == null) {
            await transaction.rollback()
            res.json({ code: 1, msg: 'El tipo de comprobante aún no está configurado' })
            return
        }

        // --- CLIENTE DATOS --- //
        let cliente = {}
        if (socio == `${empresa.subdominio}-CLIENTES-VARIOS`) {
            cliente = {
                doc_tipo: '0',
                doc_numero: '00000000',
                doc_nombres: '00000000 - CLIENTES VARIOS',
                nombres: 'CLIENTES VARIOS',
            }
        }
        else {
            cliente = await Socio.findByPk(socio)
        }

        // --- CREAR --- //
        const send = {
            socio,
            pago_condicion,
            transaccion,
            caja_apertura: caja_apertura.id,
            estado,

            empresa_datos: {
                ruc: empresa.ruc,
                razon_social: empresa.razon_social,
                nombre_comercial: empresa.nombre_comercial,
                telefono: empresa.telefono,
                domicilio_fiscal: empresa.domicilio_fiscal,
                ubigeo: empresa.ubigeo,
                distrito: empresa.distrito,
                provincia: empresa.provincia,
                departamento: empresa.departamento,
                anexo: '0000',
            },
            cliente_datos: {
                razon_social_nombres: cliente.nombres,
                doc_numero: cliente.doc_numero,
                doc_tipo: cliente.doc_tipo,
                direccion: cliente.direccion,
            },

            doc_tipo,
            serie: pago_comprobante.serie,
            numero: pago_comprobante.correlativo,
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

            empresa: empresa.id,
            createdBy: colaborador
        }

        const nuevo = await Comprobante.create(send, { transaction })

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
                empresa: empresa.id,
                createdBy: colaborador
            })

            i++
        }
        send.items = items
        await ComprobanteItem.bulkCreate(items, { transaction })

        // --- CREAR MIFACT --- //
        let res_mifact
        // if ([`${empresa.subdominio}-01`, `${empresa.subdominio}-03`].includes(doc_tipo)) {
        if (['01', '03'].includes(doc_tipo)) {
            res_mifact = await sendDoc(send)
            if (res_mifact.errors && res_mifact.errors != "") {
                await transaction.rollback()
                res.json({ code: 1, msg: 'Problemas al emitir comprobante, verifique datos', data: res_mifact })
                return
            }

            // --- ACTUALIZAR RESPUESTA SUNAT --- //
            await Comprobante.update(
                {
                    hash: res_mifact.codigo_hash,
                    estado: res_mifact.sunat_responsecode == 0 ? 3 : 2,
                    sunat_respuesta_codigo: res_mifact.sunat_responsecode,
                    sunat_respuesta_nota: res_mifact.sunat_note,
                    sunat_respuesta_descripcion: res_mifact.sunat_description,
                },
                {
                    where: { id: nuevo.id },
                    transaction
                }
            )
        }
        else {
            await Comprobante.update(
                {
                    estado: 3,
                },
                {
                    where: { id: nuevo.id },
                    transaction
                }
            )
        }
        // throw error

        // --- ACTUALIZAR CORRELATIVO --- //
        await ComprobanteTipo.update(
            { correlativo: pago_comprobante.correlativo + 1 },
            {
                where: { id: doc_tipo },
                transaction
            }
        )

        // --- GUARDAR KARDEX --- //
        const kardexItems = []
        for (const a of comprobante_items) {
            if (a.is_combo == true) {
                for (const b of a.combo_articulos) {
                    if (b.articulo1.has_receta) {
                        for (const c of b.articulo1.receta_insumos) {
                            kardexItems.push({
                                tipo: 2,
                                fecha: fecha_emision,
                                articulo: c.articulo,
                                cantidad: c.cantidad * b.cantidad * a.cantidad,
                                estado: 1,
                                transaccion,
                                comprobante: nuevo.id,
                                empresa: empresa.id,
                                createdBy: colaborador
                            })
                        }
                    } else {
                        kardexItems.push({
                            tipo: 2,
                            fecha: fecha_emision,
                            articulo: b.articulo,
                            cantidad: b.cantidad * a.cantidad,
                            estado: 1,
                            transaccion,
                            comprobante: nuevo.id,
                            empresa: empresa.id,
                            createdBy: colaborador
                        })
                    }
                }
            }
            else {
                if (a.has_receta == true) {
                    for (const b of a.receta_insumos) {
                        kardexItems.push({
                            tipo: 2,
                            fecha: fecha_emision,
                            articulo: b.articulo,
                            cantidad: b.cantidad * a.cantidad,
                            estado: 1,
                            transaccion,
                            comprobante: nuevo.id,
                            empresa: empresa.id,
                            createdBy: colaborador
                        })
                    }
                } else {
                    kardexItems.push({
                        tipo: 2,
                        fecha: fecha_emision,
                        articulo: a.articulo,
                        cantidad: a.cantidad,
                        estado: 1,
                        transaccion,
                        comprobante: nuevo.id,
                        empresa: empresa.id,
                        createdBy: colaborador
                    })
                }
            }
        }
        await Kardex.bulkCreate(kardexItems, { transaction })

        // --- ACTUALIZAR STOCK --- //
        const transaccion_tiposMap = arrayMap('kardex_tipos')
        const tipoInfo = transaccion_tiposMap[2]
        for (const a of kardexItems) {
            await Articulo.update(
                {
                    stock: sequelize.literal(`COALESCE(stock, 0) ${tipoInfo.operacion == 1 ? '+' : '-'} ${a.cantidad}`)
                },
                {
                    where: { id: a.articulo },
                    transaction
                }
            )
        }

        // --- ACTUALIZAR PEDIDO ITEMS --- //
        if (transaccion1.venta_canal != '4') {
            for (const a of comprobante_items) {
                await TransaccionItem.update(
                    {
                        venta_entregado: sequelize.literal(`COALESCE(venta_entregado, 0) + ${Number(a.cantidad)}`)
                    },
                    {
                        where: {
                            id: a.id1,
                            transaccion
                        },
                        transaction
                    }
                )
            }
        }

        // --- GUARDAR PAGOS --- //
        if (pago_condicion == 1) {
            const pagoItems = pago_metodos.filter(a => a.monto > 0).map(a => ({
                fecha: fecha_emision,
                tipo: 1,
                operacion: 1,
                detalle: null,
                pago_metodo: a.id,
                monto: a.monto,
                comprobante: nuevo.id,
                caja_apertura: caja_apertura.id,
                empresa: empresa.id,
                createdBy: colaborador
            }))
            await DineroMovimiento.bulkCreate(pagoItems, { transaction })
        }

        await transaction.commit()

        // --- ACTUALIZAR PEDIDO SI SE FACTURÓ TODO --- //
        if (transaccion1.venta_canal != '4') {
            const pedido_items = await TransaccionItem.findAll({
                where: { transaccion }
            })

            const is_pendiente = pedido_items.some(a => a.venta_entregado < a.cantidad)
            if (is_pendiente == false) {
                // --- Si es mesa --- //
                const send = { venta_facturado: true }
                if (transaccion1.venta_canal == 1) {
                    send.venta_entregado = true
                    send.estado = 2
                }

                await Transaccion.update(
                    send,
                    {
                        where: { id: transaccion },
                    }
                )
            }
        }

        // --- DEVOLVER --- //
        const data = await getComprobante(nuevo.id, empresa)
        const data_transaccion = await loadOneTransaccion(transaccion)

        res.json({ code: 0, data, facturacion: res_mifact, data_transaccion })
    }
    catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        const findProps = {
            attributes: ['id'],
            order: [['numero', 'ASC']],
            where: { empresa: empresa.id },
            include: []
        }

        if (qry) {
            if (qry.incl) {
                for (const a of qry.incl) {
                    if (qry.incl.includes(a)) findProps.include.push(include1[a])
                }
            }

            if (qry.fltr) {
                Object.assign(findProps.where, applyFilters(qry.fltr))
            }

            if (qry.cols) {
                const excludeCols = ['pagos_monto']
                const cols1 = qry.cols.filter(a => !excludeCols.includes(a))
                findProps.attributes = findProps.attributes.concat(cols1)

                // --- AGREAGAR LOS REF QUE SI ESTÁN EN LA BD --- //
                if (qry.cols.includes('socio')) findProps.include.push(include1.socio1)
            }

            if (qry.sqls) {
                for (const a of qry.sqls) {
                    if (sqls1[a]) findProps.attributes.push(sqls1[a])
                }
            }
        }

        let data = await Comprobante.findAll(findProps)

        if (data.length > 0 && qry.cols) {
            data = data.map(a => a.toJSON())

            const pago_condicionesMap = arrayMap('pago_condiciones')
            const pago_comprobantesMap = arrayMap('comprobante_tipos')
            const comprobante_estadosMap = arrayMap('comprobante_estados')

            for (const a of data) {
                const tKey = a.doc_tipo.replace(`${empresa.subdominio}-`, '')
                if (qry.cols.includes('doc_tipo')) a.doc_tipo1 = pago_comprobantesMap[tKey]
                if (qry.cols.includes('pago_condicion')) a.pago_condicion1 = pago_condicionesMap[a.pago_condicion]
                if (qry.cols.includes('estado')) a.estado1 = comprobante_estadosMap[a.estado]
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
        const { empresa } = req.user
        const { id } = req.params
        const data = await getComprobante(id, empresa)

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const getPdf = async (req, res) => {
    try {
        const { empresa } = req.user
        const { id } = req.params

        const data = await getComprobante(id, empresa)
        const buffer = await makePdf(data, empresa)

        res.setHeader("Content-Type", "application/pdf")
        res.setHeader("Content-Disposition", `inline; filename=${data.serie}-${data.numero}.pdf`)
        res.send(buffer)
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const sendMail = async (req, res) => {
    try {
        const { empresa } = req.user
        const { id, email_to_send } = req.body

        const data = await getComprobante(id, empresa)
        const buffer = await makePdf(data, empresa)
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
                    content: buffer.toString("base64"),
                    encoding: "base64",
                },
            ],
        })

        if (result.error) {
            console.error("Error al enviar email:", result.error);
            return res.status(500).json({ code: 1, msg: "No se pudo enviar el correo", error: result.error });
        }
        else {
            res.json({ code: 0 })
        }
    }
    catch (error) {
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
            caja_apertura1 = await CajaApertura.findOne({ where: { estado: '1' } })

            // --- VERIFY SI CAJA ESTÁ APERTURADA --- //
            if (caja_apertura1 == null) {
                await transaction.rollback()
                res.json({ code: 1, msg: 'La caja no está aperturada' })
                return
            }
        }

        if (modal_mode == 2) {
            // --- ELIMINAR PAGOS ANTERIORES --- //
            await DineroMovimiento.destroy({
                where: { comprobante: id },
                transaction
            })
        }

        // --- GUARDAR PAGOS --- //
        const pagoItems = pago_metodos.filter(a => a.monto > 0).map(a => ({
            fecha: modal_mode == 1 ? caja_apertura1.fecha_apertura : fecha_emision,
            tipo: 1,
            operacion: 1,
            detalle: null,
            pago_metodo: a.id,
            monto: a.monto,
            comprobante: id,
            caja_apertura: modal_mode == 1 ? caja_apertura1.id : caja_apertura,
            empresa: empresa.id,
            createdBy: colaborador
        }))
        await DineroMovimiento.bulkCreate(pagoItems, { transaction })

        await transaction.commit()

        res.json({ code: 0 })
    }
    catch (error) {
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
        if (['01', '03'].includes(item.doc_tipo)) {
            res_mifact = await anularDoc(item)
            if (res_mifact.errors && res_mifact.errors != "") {
                await transaction.rollback()
                res.json({ code: 1, msg: 'No se pudo anular el comprobante', data: res_mifact })
                return
            }
        }

        // --- ANULAR --- //
        await Comprobante.update(
            {
                estado: 0,
                anulado_motivo,
                updatedBy: colaborador
            },
            {
                where: { id },
                transaction
            }
        )

        // --- ANULAR PAGOS --- //
        await DineroMovimiento.update(
            {
                estado: 0,
                updatedBy: colaborador
            },
            {
                where: { comprobante: id },
                transaction
            }
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
        const {
            fecha_emision, doc_tipo, doc_tipo1, socio
        } = req.body

        const comprobante = await Comprobante.findByPk(id, {
            include: [
                {
                    model: ComprobanteItem,
                    as: 'comprobante_items',
                },
            ]
        })

        // --- ANULAR MIFACT --- //
        let res1_mifact
        // if (comprobante.doc_tipo != `${empresa.subdominio}-NV`) {
        //     res1_mifact = await anularDoc(comprobante)
        //     if (res1_mifact.errors && res1_mifact.errors != "") {
        //         await transaction.rollback()
        //         res.json({ code: 1, msg: 'No se pudo anular el comprobante', data: res1_mifact })
        //         return
        //     }
        // }

        // --- CREAR NUEVO COMPROBANTE --- //
        const cliente = await Socio.findByPk(socio)
        const pago_comprobante = await ComprobanteTipo.findByPk(doc_tipo1)

        const send = {
            socio,
            pago_condicion: comprobante.pago_condicion,
            transaccion: comprobante.transaccion,
            caja_apertura: comprobante.caja_apertura,
            empresa_datos: comprobante.empresa_datos,
            cliente_datos: {
                razon_social_nombres: cliente.nombres,
                doc_numero: cliente.doc_numero,
                doc_tipo: cliente.doc_tipo,
                direccion: cliente.direccion,
            },
            estado: 1,

            doc_tipo: doc_tipo1,
            serie: pago_comprobante.serie,
            numero: pago_comprobante.correlativo,
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

            empresa: empresa.id,
            createdBy: colaborador
        }

        const nuevo = await Comprobante.create(send, { transaction })

        // --- GUARDAR ITEMS --- //
        const items = []
        for (const a of comprobante.comprobante_items) {
            // calculateInvoiceLineValues(a)

            items.push({
                articulo: a.articulo,
                descripcion: a.descripcion,
                codigo: a.codigo_producto,
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
                empresa: empresa.id,
                createdBy: colaborador
            })
        }
        send.items = items
        await ComprobanteItem.bulkCreate(items, { transaction })

        // --- CREAR MIFACT --- //
        let res_mifact
        if (['01', '03'].includes(doc_tipo1)) {
            res_mifact = await sendDoc(send)
            if (res_mifact.errors && res_mifact.errors != "") {
                await transaction.rollback()
                res.json({ code: 1, msg: 'Problemas al emitir comprobante, verifique datos', data: res_mifact })
                return
            }

            // --- ACTUALIZAR RESPUESTA SUNAT --- //
            await Comprobante.update(
                {
                    hash: res_mifact.codigo_hash,
                    estado: res_mifact.sunat_responsecode == 0 ? 3 : 2,
                    sunat_respuesta_codigo: res_mifact.sunat_responsecode,
                    sunat_respuesta_nota: res_mifact.sunat_note,
                    sunat_respuesta_descripcion: res_mifact.sunat_description,
                },
                {
                    where: { id: nuevo.id },
                    transaction
                }
            )
        }
        else {
            await Comprobante.update(
                {
                    estado: 3,
                },
                {
                    where: { id: nuevo.id },
                    transaction
                }
            )
        }

        // --- ACTUALIZAR CORRELATIVO --- //
        await ComprobanteTipo.update(
            { correlativo: pago_comprobante.correlativo + 1 },
            {
                where: { id: doc_tipo1 },
                transaction
            }
        )

        // --- ACTUALIZAR ESTADO CANJEADO --- //
        await Comprobante.update(
            {
                estado: 4,
                canjeado_por: nuevo.id,
                updatedBy: colaborador
            },
            {
                where: { id },
                transaction
            }
        )

        // --- ACTUALIZAR PAGOS --- //
        await DineroMovimiento.update(
            {
                comprobante: nuevo.id,
                updatedBy: colaborador
            },
            {
                where: { comprobante: id },
                transaction
            }
        )

        await transaction.commit()

        res.json({ code: 0, new: res_mifact, past: res1_mifact })
    }
    catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const resumen = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        const findProps = {
            attributes: ['id', 'fecha_emision', 'doc_tipo', 'serie', 'numero', 'serie_correlativo', 'monto', 'pago_condicion', 'estado'],
            order: [['createdAt', 'ASC']],
            where: { empresa: empresa.id },
            include: [
                {
                    model: ComprobanteItem,
                    as: 'comprobante_items',
                    attributes: ['id', 'articulo', 'descripcion', 'pu', 'descuento_tipo', 'descuento_valor', 'cantidad'],
                },
                {
                    model: Transaccion,
                    as: 'transaccion1',
                    attributes: ['id', 'venta_canal'],
                },
                {
                    model: DineroMovimiento,
                    as: 'dinero_movimientos',
                    attributes: ['id', 'pago_metodo', 'monto'],
                    include: {
                        model: PagoMetodo,
                        as: 'pago_metodo1',
                        attributes: ['id', 'nombre', 'color']
                    }
                }
            ]
        }

        if (qry) {
            Object.assign(findProps.where, applyFilters(qry.fltr))
        }

        const comprobantes = await Comprobante.findAll(findProps)

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

        const pago_comprobantesMap = arrayMap('comprobante_tipos')
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
                            itemStyle: { color: b.pago_metodo1.color }
                        }
                        ventas.pago_metodos.push(item)
                        pagoMetodosMap[mkey] = item
                    } else {
                        pagoMetodosMap[mkey].value += Number(b.monto)
                    }
                }

                // --- TIPOS DE COMPROBANTES --- //
                const tKey = a.doc_tipo.replace(`${empresa.subdominio}-`, '')
                if (!comprobanteTiposMap[tKey]) {
                    const item = {
                        id: tKey,
                        name: pago_comprobantesMap[tKey].nombre,
                        value: Number(a.monto),
                    }
                    ventas.comprobante_tipos.push(item)
                    comprobanteTiposMap[tKey] = item
                } else {
                    comprobanteTiposMap[tKey].value += Number(a.monto)
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
                const mes = dayjs(a.fecha_emision).format("YYYY-MMM")
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
            general: ventas.total + anulados.total + ventas.descuentos + anulados.descuentos
        }

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}


// --- Funciones --- //
async function getComprobante(id, empresa) {
    let data = await Comprobante.findByPk(id, {
        include: [
            {
                model: ComprobanteItem,
                as: 'comprobante_items',
            },
            {
                model: Transaccion,
                as: 'transaccion1',
                attributes: ['venta_canal', 'venta_mesa', 'venta_socio_datos'],
                include: {
                    model: Mesa,
                    as: 'venta_mesa1',
                    attributes: ['id', 'nombre'],
                    include: {
                        model: Salon,
                        as: 'salon1',
                        attributes: ['id', 'nombre']
                    }
                }
            },
            {
                model: DineroMovimiento,
                as: 'dinero_movimientos',
                attributes: ['id', 'pago_metodo', 'monto'],
                include: {
                    model: PagoMetodo,
                    as: 'pago_metodo1',
                    attributes: ['id', 'nombre']
                }
            }
        ]
    })

    if (data) {
        data = data.toJSON()

        const tKey = data.doc_tipo.replace(`${empresa.subdominio}-`, '')
        const pago_comprobantesMap = arrayMap('comprobante_tipos')
        const documentos_identidadMap = arrayMap('documentos_identidad')
        const pago_condicionesMap = arrayMap('pago_condiciones')
        const venta_canalesMap = arrayMap('venta_canales')

        data.doc_tipo1 = pago_comprobantesMap[tKey]
        data.cliente_datos.doc_tipo1 = documentos_identidadMap[data.cliente_datos.doc_tipo]
        data.pago_condicion1 = pago_condicionesMap[data.pago_condicion]
        data.venta_canal1 = venta_canalesMap[data.transaccion1.venta_canal]

        data.total_letras = numeroATexto(data.monto)
        // data.qr_string = `${data.empresa_datos.ruc}|${tKey}|${data.serie}|${data.numero}|${data.igv}|${data.monto}|${data.fecha_emision}|${data.cliente_datos.doc_tipo}|${data.cliente_datos.doc_numero}|${data.hash}`
        data.qr_string = `${data.empresa_datos.ruc}|${tKey}|${data.serie}|${data.numero}|${data.igv}|${data.monto}|${data.fecha_emision}|${data.cliente_datos.doc_tipo}|${data.cliente_datos.doc_numero}`

        data.moneda1 = {
            plural: 'SOLES',
            singular: 'SOL'
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
    // const logoPath = getFilePath(empresa.logo)
    // const logoBase64 = fs.readFileSync(logoPath).toString("base64");
    const logoBase64 = await getImageBase64(empresa.logo_url)
    const tKey = doc.doc_tipo.replace(`${empresa.subdominio}-`, '')

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
    // console.log(1)
    // --- TIPO DE ATENCIÓN --- //
    if (doc.transaccion1.venta_canal == 1) {
        doc.atencion = `${doc.transaccion1.venta_mesa1.salon1.nombre} - ${doc.transaccion1.venta_mesa1.nombre}`
    } else {
        doc.atencion = doc.venta_canal1.nombre
    }
    // console.log(2)
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
    // console.log(3)
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
    const qrStack = tKey == 'NV' ? null : {
        qr: doc.qr_string,
        fit: 115,
        alignment: "center",
        margin: [0, 10, 0, 10],
    }

    // --- SUNAT --- //
    let sunatStack = null
    if (tKey == '01') {
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
            ]
        }
    }
    else if (tKey == '03') {
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
            ]
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
            alignment: "center", // opcional (left, center, right)
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
            stack: [`${doc.doc_tipo1.nombre}${tKey == 'NV' ? '' : ' ELECTRÓNICA'}`, `${doc.serie}-${doc.numero}`],
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
                    text: `DIRECCIÓN: ${doc.cliente_datos.direccion || ""}`,
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
        { text: 'GRACIAS POR SU PREFERENCIA', style: 'empresa_style', fontSize: 8, margin: [0, 10, 0, 0] },
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
            normal: 'src/fonts/Roboto-Regular.ttf',
            bold: 'src/fonts/Roboto-Bold.ttf',
        }
    }

    return new Promise((resolve, reject) => {
        const printer = new PdfPrinter(fonts)
        const pdfDoc = printer.createPdfKitDocument(docDefinition)

        let chunks = []
        pdfDoc.on("data", chunk => chunks.push(chunk))
        pdfDoc.on("end", () => {
            const buffer = Buffer.concat(chunks)
            resolve(buffer)
        })
        pdfDoc.on("error", reject)
        pdfDoc.end()
    })
}

function calcularUno(item) {
    if (
        item.descuento_tipo != null &&
        item.descuento_valor != null &&
        item.descuento_valor != 0
    ) {
        if (item.descuento_tipo == 1) {
            item.pu_desc = item.descuento_valor
        } else if (item.descuento_tipo == 2) {
            item.pu_desc = item.cantidad * item.pu * (item.descuento_valor / 100)
        }
    } else {
        item.pu_desc = 0
    }

    item.descuento = item.pu_desc
    item.total = (item.cantidad * item.pu) - item.descuento

    return item
}

async function loadOneTransaccion(id) {
    try {
        let data = await Transaccion.findByPk(id, {
            attributes: {
                include: [
                    [
                        literal(`(SELECT COALESCE(SUM(c.monto), 0) FROM comprobantes AS c WHERE c.transaccion = "transacciones"."id")`), "comprobantes_monto"
                    ]
                ]
            },
            include: [
                {
                    model: Socio,
                    as: 'socio1',
                    attributes: ['id', 'nombres']
                },
                {
                    model: Colaborador,
                    as: 'createdBy1',
                    attributes: ['id', 'nombres', 'apellidos', 'nombres_apellidos']
                },
                {
                    model: Mesa,
                    as: 'venta_mesa1',
                    attributes: ['id', 'nombre'],
                    include: {
                        model: Salon,
                        as: 'salon1',
                        attributes: ['id', 'nombre']
                    }
                }
            ]
        })

        if (data) {
            data = data.toJSON()
            // console.log(data)

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
        }
        else {
            const { name, buffer } = res_mifact

            res.setHeader("Content-Type", "application/xml")
            res.setHeader("Content-Disposition", `inline; filename=${name}`)
            res.send(buffer)
        }
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }

    // const filePath = path.join(pathXml, id)

    // const exists = fs.existsSync(filePath)
    // if (exists) {
    //     res.sendFile(filePath)
    // }
    // else {
    //     res.status(404).json({ msg: 'Archivo no encontrado' })
    // }
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
