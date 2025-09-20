import sequelize from '../../database/sequelize.js'
import { literal } from 'sequelize'
import { Comprobante, ComprobanteItem } from '../../database/models/Comprobante.js'
import { Empresa } from '../../database/models/Empresa.js'
import { Socio } from '../../database/models/Socio.js'
import { PagoComprobante } from '../../database/models/PagoComprobante.js'
import { Kardex } from '../../database/models/Kardex.js'
import { Articulo } from '../../database/models/Articulo.js'
import { Transaccion, TransaccionItem } from '../../database/models/Transaccion.js'
import { Colaborador } from '../../database/models/Colaborador.js'
import { CajaApertura } from '../../database/models/CajaApertura.js'
import { DineroMovimiento } from "../../database/models/DineroMovimiento.js"
import { Mesa } from '../../database/models/Mesa.js'
import { Salon } from '../../database/models/Salon.js'
import { PagoMetodo } from '../../database/models/PagoMetodo.js'
import { applyFilters, numeroATexto } from '../../utils/mine.js'
import cSistema from "../_sistema/cSistema.js"
import dayjs from "dayjs"

import PdfPrinter from 'pdfmake'
import { pathXml, getFilePath } from '../../utils/uploadFiles.js'
import fs from "fs"
import path from "path"

import config from '../../config.js'
import { Resend } from 'resend'
import { comprobanteHtml } from '../../utils/layouts.js'

import { crearXml } from '../../utils/sunat/crearXml.js'
import { firmarXml } from '../../utils/sunat/firmarXml.js'
import { enviarSunat } from '../../utils/sunat/enviarSunat.js'
import { sendDoc, anularDoc, estadoDoc, xmlDoc, calculateInvoiceLineValues } from '../../utils/sunat/mifact.js'


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
}

const sqls1 = {
    pagos_monto: [
        literal(`(SELECT COALESCE(SUM(c.monto), 0) FROM dinero_movimientos AS c WHERE c.comprobante = "comprobantes"."id")`),
        "pagos_monto"
    ]
}


// --- Rutas --- //
const create = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador } = req.user
        const {
            fecha_emision, doc_tipo, socio, pago_condicion, estado,
            // sub_total_ventas, anticipos, descuentos, valor_venta,
            // isc, igv, icbper, otros_cargos, otros_tributos,
            gravado, exonerado, inafecto, gratuito, descuentos,
            igv, isc, icbper,
            monto, nota,
            comprobante_items, transaccion, pago_metodos,
        } = req.body

        const empresa = await Empresa.findByPk('1')
        const cliente = await Socio.findByPk(socio)
        const pago_comprobante = await PagoComprobante.findByPk(doc_tipo)
        const caja_apertura = await CajaApertura.findOne({ where: { estado: '1' } })

        // --- VERIFY SI CAJA ESTÁ APERTURADA --- //
        if (caja_apertura == null) return res.json({ code: 1, msg: 'La caja no está aperturada' })

        // --- CREAR --- //
        const send = {
            socio,
            pago_condicion,
            transaccion: transaccion.id,
            caja_apertura: caja_apertura.id,
            estado,

            empresa: {
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
            cliente: {
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
                PRC_VTA_UNIT_ITEM: a.PRC_VTA_UNIT_ITEM,
                VAL_UNIT_ITEM: a.VAL_UNIT_ITEM,
                VAL_VTA_ITEM: a.VAL_VTA_ITEM,
                MNT_BRUTO: a.MNT_BRUTO,
                MNT_PV_ITEM: a.MNT_PV_ITEM,

                COD_TIP_PRC_VTA: a.COD_TIP_PRC_VTA,
                COD_TRIB_IGV_ITEM: a.COD_TRIB_IGV_ITEM,
                POR_IGV_ITEM: a.POR_IGV_ITEM,
                MNT_IGV_ITEM: a.MNT_IGV_ITEM,

                MNT_DSCTO_ITEM: a.MNT_DSCTO_ITEM,
                COD_TIP_SIST_ISC: a.COD_TIP_SIST_ISC,
                MNT_ISC_ITEM: a.MNT_ISC_ITEM,
                POR_ISC_ITEM: a.POR_ISC_ITEM,
                IMPUESTO_BOLSAS_UNIT: a.IMPUESTO_BOLSAS_UNIT,

                comprobante: nuevo.id,
                createdBy: colaborador
            })

            i++
        }
        send.items = items
        await ComprobanteItem.bulkCreate(items, { transaction })

        let mifact
        if (['01', '03'].includes(doc_tipo)) {
            // const fileName = `${send.empresa.ruc}-${send.doc_tipo}-${send.serie}-${send.numero}.xml`
            // crearXml(fileName, send)
            // const hash = firmarXml(fileName)
            // const sunat_respuesta = await enviarSunat(fileName)
            mifact = await sendDoc(send)
            if (mifact.errors && mifact.errors != "") {
                res.json({ code: 1, msg: 'Problemas al emitir comprobante, verifique datos', data: mifact })
                return
            }

            await Comprobante.update(
                {
                    hash: mifact.codigo_hash,
                    estado: mifact.sunat_responsecode == 0 ? 3 : 2,
                    sunat_respuesta_codigo: mifact.sunat_responsecode,
                    sunat_respuesta_nota: mifact.sunat_note,
                    sunat_respuesta_descripcion: mifact.sunat_description,
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
        await PagoComprobante.update(
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
                                transaccion: transaccion.id,
                                comprobante: nuevo.id,
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
                            transaccion: transaccion.id,
                            comprobante: nuevo.id,
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
                            transaccion: transaccion.id,
                            comprobante: nuevo.id,
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
                        transaccion: transaccion.id,
                        comprobante: nuevo.id,
                        createdBy: colaborador
                    })
                }
            }
        }
        await Kardex.bulkCreate(kardexItems, { transaction })

        // --- ACTUALIZAR STOCK --- //
        const transaccion_tiposMap = cSistema.arrayMap('kardex_tipos')
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
        for (const a of comprobante_items) {
            await TransaccionItem.update(
                {
                    venta_entregado: Number(a.cantidad) + Number(a.venta_entregado)
                },
                {
                    where: {
                        articulo: a.articulo,
                        transaccion: transaccion.id
                    },
                    transaction
                }
            )
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
                createdBy: colaborador
            }))
            await DineroMovimiento.bulkCreate(pagoItems, { transaction })
        }

        await transaction.commit()

        // --- ACTUALIZAR PEDIDO SI SE FACTURÓ TODO --- //
        const pedido_items = await TransaccionItem.findAll({
            where: { transaccion: transaccion.id }
        })

        const is_pendiente = pedido_items.some(a => a.venta_entregado < a.cantidad)
        if (is_pendiente == false) {
            const send = { venta_facturado: true }
            if (transaccion.venta_canal == 1) {
                send.venta_entregado = true
                send.estado = 2
            }

            await Transaccion.update(
                send,
                {
                    where: { id: transaccion.id },
                }
            )
        }

        // --- DEVOLVER --- //
        const data = await loadOne(nuevo.id)
        res.json({ code: 0, data, mifact })
    }
    catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const find = async (req, res) => {
    try {
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        const findProps = {
            attributes: ['id'],
            order: [['createdAt', 'DESC']],
            where: {},
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

            const pago_condicionesMap = cSistema.arrayMap('pago_condiciones')
            const pago_comprobantes = cSistema.arrayMap('pago_comprobantes')
            const comprobante_estadosMap = cSistema.arrayMap('comprobante_estados')

            for (const a of data) {
                if (qry.cols.includes('pago_condicion')) a.pago_condicion1 = pago_condicionesMap[a.pago_condicion]
                if (qry.cols.includes('doc_tipo')) a.doc_tipo1 = pago_comprobantes[a.doc_tipo]
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
        const { id } = req.params
        const data = await getComprobante(id)
        data.total_letras = numeroATexto(data.monto)
        data.moneda1 = {
            plural: 'SOLES',
            singular: 'SOL'
        }

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const getPdf = async (req, res) => {
    try {
        const { id } = req.params

        // const empresa = await Empresa.findByPk(1)
        const data = await getComprobante(id)
        const buffer = await makePdf(data)

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
        const { id } = req.body

        const data = await getComprobante(id)
        const buffer = await makePdf(data)
        const comprobante_numero = `${data.serie}-${data.numero}`
        const html = comprobanteHtml(comprobante_numero)

        const resend = new Resend(config.resendApiKey)
        resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'jhuler.code@gmail.com',
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

        res.json({ code: 0 })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const actualizarPago = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador } = req.user
        const { id } = req.params
        const { fecha_emision, caja_apertura, pago_metodos, modal_mode } = req.body

        let caja_apertura1
        if (modal_mode == 1) {
            caja_apertura1 = await CajaApertura.findOne({ where: { estado: '1' } })

            // --- VERIFY SI CAJA ESTÁ APERTURADA --- //
            if (caja_apertura1 == null) return res.json({ code: 1, msg: 'La caja no está aperturada' })
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

        const mifact = await anularDoc(item)

        res.json({ code: 0, mifact })
        return
        // --- ANULAR --- //
        await Comprobante.update(
            {
                estado: 0,
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

        res.json({ code: 0, mifact })

    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const canjear = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador } = req.user
        const { id } = req.params
        const {
            fecha_emision, doc_tipo, socio
        } = req.body

        const comprobante = await Comprobante.findByPk(id, {
            include: [
                {
                    model: ComprobanteItem,
                    as: 'comprobante_items',
                },
            ]
        })

        // --- CREAR NUEVO COMPROBANTE --- //
        const cliente = await Socio.findByPk(socio)
        const pago_comprobante = await PagoComprobante.findByPk(doc_tipo)

        const send = {
            socio,
            pago_condicion: comprobante.pago_condicion,
            transaccion: comprobante.transaccion,
            caja_apertura: comprobante.caja_apertura,
            empresa: comprobante.empresa,
            cliente: {
                razon_social_nombres: cliente.nombres,
                doc_numero: cliente.doc_numero,
                doc_tipo: cliente.doc_tipo,
                direccion: cliente.direccion,
            },
            estado: 1,

            doc_tipo,
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

            createdBy: colaborador
        }

        const nuevo = await Comprobante.create(send, { transaction })

        // --- GUARDAR ITEMS --- //
        const items = []
        for (const a of comprobante.comprobante_items) {
            calculateInvoiceLineValues(a)

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
                PRC_VTA_UNIT_ITEM: a.PRC_VTA_UNIT_ITEM,
                VAL_UNIT_ITEM: a.VAL_UNIT_ITEM,
                VAL_VTA_ITEM: a.VAL_VTA_ITEM,
                MNT_BRUTO: a.MNT_BRUTO,
                MNT_PV_ITEM: a.MNT_PV_ITEM,

                COD_TIP_PRC_VTA: a.COD_TIP_PRC_VTA,
                COD_TRIB_IGV_ITEM: a.COD_TRIB_IGV_ITEM,
                POR_IGV_ITEM: a.POR_IGV_ITEM,
                MNT_IGV_ITEM: a.MNT_IGV_ITEM,

                MNT_DSCTO_ITEM: a.MNT_DSCTO_ITEM,
                COD_TIP_SIST_ISC: a.COD_TIP_SIST_ISC,
                MNT_ISC_ITEM: a.MNT_ISC_ITEM,
                POR_ISC_ITEM: a.POR_ISC_ITEM,
                IMPUESTO_BOLSAS_UNIT: a.IMPUESTO_BOLSAS_UNIT,

                comprobante: nuevo.id,
                createdBy: colaborador
            })
        }
        send.items = items
        await ComprobanteItem.bulkCreate(items, { transaction })

        const mifact = await sendDoc(send)
        if (mifact.errors && mifact.errors != "") {
            res.json({ code: 1, msg: 'Problemas al emitir comprobante, verifique datos', data: mifact })
            return
        }

        // --- ACTUALIZAR RESPUESTA SUNAT --- //
        await Comprobante.update(
            {
                hash: mifact.codigo_hash,
                estado: mifact.sunat_responsecode == 0 ? 3 : 2,
                sunat_respuesta_codigo: mifact.sunat_responsecode,
                sunat_respuesta_nota: mifact.sunat_note,
                sunat_respuesta_descripcion: mifact.sunat_description,
            },
            {
                where: { id: nuevo.id },
                transaction
            }
        )

        const mifact_anular = await anularDoc(comprobante)

        // --- ACTUALIZAR CORRELATIVO --- //
        await PagoComprobante.update(
            { correlativo: pago_comprobante.correlativo + 1 },
            {
                where: { id: doc_tipo },
                transaction
            }
        )

        // --- ESTADO CANJEADO --- //
        await Comprobante.update(
            {
                estado: 3,
                canjeado_por: nuevo.id,
                updatedBy: colaborador
            },
            {
                where: { id },
                transaction
            }
        )

        // --- CAMBIAR PAGOS --- //
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

        res.json({ code: 0 })
    }
    catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const resumen = async (req, res) => {
    try {
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        const findProps = {
            attributes: ['id', 'fecha_emision', 'doc_tipo', 'serie', 'numero', 'serie_correlativo', 'monto', 'pago_condicion', 'estado'],
            order: [['createdAt', 'ASC']],
            where: {},
            include: [
                {
                    model: ComprobanteItem,
                    as: 'comprobante_items',
                    attributes: ['id', 'articulo', 'descripcion', 'pu', 'descuento_tipo', 'descuento_valor', 'cantidad'],
                },
                {
                    model: Transaccion,
                    as: 'transaccion1',
                    attributes: ['venta_canal'],
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

        const pago_comprobantesMap = cSistema.arrayMap('pago_comprobantes')
        const venta_canalesMap = cSistema.arrayMap('venta_canales')

        // --- INDICES AUXILIARES --- //
        const pagoMetodosMap = {}
        const comprobanteTiposMap = {}
        const canalesMap = {}
        const productosMap = {}
        const mesesMap = {}

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
                const tKey = a.doc_tipo
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
                    }
                    ventas.canales.push(item)
                    canalesMap[cKey] = item
                } else {
                    canalesMap[cKey].value += Number(a.monto)
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

        res.json({ code: 0, data, comprobantes })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}


// --- Funciones --- //
async function loadOne(id) {
    let data = await Comprobante.findByPk(id, {
        include: [include1.socio1, include1.createdBy1]
    })

    if (data) {
        data = data.toJSON()

        const pago_condicionesMap = cSistema.arrayMap('pago_condiciones')
        const transaccion_estadosMap = cSistema.arrayMap('transaccion_estados')

        data.pago_condicion1 = pago_condicionesMap[data.pago_condicion]
        data.estado1 = transaccion_estadosMap[data.estado]
    }

    return data
}

async function getComprobante(id) {
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

        const pago_comprobantesMap = cSistema.arrayMap('pago_comprobantes')
        const documentos_identidadMap = cSistema.arrayMap('documentos_identidad')
        const pago_condicionesMap = cSistema.arrayMap('pago_condiciones')
        const venta_canalesMap = cSistema.arrayMap('venta_canales')

        data.doc_tipo1 = pago_comprobantesMap[data.doc_tipo]
        data.cliente.doc_tipo1 = documentos_identidadMap[data.cliente.doc_tipo]
        data.pago_condicion1 = pago_condicionesMap[data.pago_condicion]
        data.venta_canal1 = venta_canalesMap[data.transaccion1.venta_canal]
    }

    return data
}

async function makePdf(doc) {
    // --- LOGO --- //
    let empresa = await Empresa.findByPk('1')
    const logoPath = getFilePath(empresa.logo)
    const logoBase64 = fs.readFileSync(logoPath).toString("base64");

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
    const qrStack = doc.doc_tipo == 'NV' ? null : {
        qr: `${doc.empresa.ruc}|${doc.doc_tipo}|${doc.serie}|${doc.numero}|${doc.igv}|${doc.monto}|${doc.fecha_emision}|${doc.cliente.doc_tipo1.nombre}|${doc.cliente.doc_numero}|`,
        fit: 100,
        alignment: "center",
        margin: [0, 10, 0, 10],
    }

    // --- SUNAT --- //
    let sunatStack = null
    if (doc.doc_tipo == '01') {
        sunatStack = {
            stack: [
                {
                    text: `Representacion impresa de la FACTURA ELECTRÓNICA`,
                    style: 'empresa',
                },
                {
                    text: `${doc.hash}`,
                    style: 'empresa',
                },
            ]
        }
    }
    else if (doc.doc_tipo == '03') {
        sunatStack = {
            stack: [
                {
                    text: `Representacion impresa de la BOLETA DE VENTA ELECTRÓNICA`,
                    style: 'empresa',
                },
                {
                    text: `${doc.hash}`,
                    style: 'empresa',
                },
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
            image: 'data:image/png;base64,' + logoBase64, // el logo en base64
            fit: [65 * 2.83465, 45 * 2.83465], // ajusta tamaño
            alignment: "center", // opcional (left, center, right)
            margin: [0, 0, 0, 10], // opcional: espacio abajo
        },
        // --- EMPRESA --- //
        {
            stack: [
                doc.empresa.razon_social,
                `RUC: ${doc.empresa.ruc}`,
                doc.empresa.domicilio_fiscal,
                `TEL: ${doc.empresa.telefono}`,
            ],
            style: 'empresa',
        },
        // --- TIPO DE DOCUMENTO --- //
        {
            stack: [`${doc.doc_tipo1.nombre} ELECTRÓNICA`, `${doc.serie}-${doc.numero}`],
            style: 'tipo_doc',
        },
        // --- CLIENTE --- //
        {
            stack: [
                {
                    text: `FECHA DE EMISIÓN: ${dayjs(doc.createdAt).format('DD-MM-YYYY HH:mm')}`,
                    style: 'datosExtra',
                },
                { text: `ATENCIÓN: ${doc.atencion}`, style: 'datosExtra' },
                {
                    text: `CLIENTE: ${doc.cliente.razon_social_nombres}`,
                    style: 'datosExtra',
                },
                {
                    text: `${doc.cliente.doc_tipo1.nombre}: ${doc.cliente.doc_numero}`,
                    style: 'datosExtra',
                },
                {
                    text: `DIRECCIÓN: ${doc.cliente.direccion || ""}`,
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
                    if (i === 0 || i === 1 || i === node.table.body.length) {
                        return 1 // línea arriba del header, abajo del header y al final
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
        {
            stack: [
                {
                    columns: [
                        { text: 'Sub total ventas:', style: 'totalesLabel' },
                        { text: doc.sub_total_ventas, style: 'totalesValue' },
                    ],
                },
                // {
                //     columns: [
                //         { text: 'Anticipos:', style: 'totalesLabel' },
                //         { text: doc.anticipos, style: 'totalesValue' },
                //     ],
                // },
                {
                    columns: [
                        { text: 'Descuentos:', style: 'totalesLabel' },
                        { text: doc.descuentos, style: 'totalesValue' },
                    ],
                },
                {
                    columns: [
                        { text: 'Valor venta:', style: 'totalesLabel' },
                        { text: doc.valor_venta, style: 'totalesValue' },
                    ],
                },
                // {
                //     columns: [
                //         { text: 'ISC:', style: 'totalesLabel' },
                //         { text: doc.isc, style: 'totalesValue' },
                //     ],
                // },
                {
                    columns: [
                        { text: 'IGV:', style: 'totalesLabel' },
                        { text: doc.igv, style: 'totalesValue' },
                    ],
                },
                // {
                //     columns: [
                //         { text: 'ICBPER:', style: 'totalesLabel' },
                //         { text: doc.icbper, style: 'totalesValue' },
                //     ],
                // },
                // {
                //     columns: [
                //         { text: 'Otros cargos:', style: 'totalesLabel' },
                //         { text: doc.otros_cargos, style: 'totalesValue' },
                //     ],
                // },
                // {
                //     columns: [
                //         { text: 'Otros tributos:', style: 'totalesLabel' },
                //         { text: doc.otros_tributos, style: 'totalesValue' },
                //     ],
                // },
                {
                    columns: [
                        { text: 'IMPORTE TOTAL:', style: 'totalesLabel' },
                        { text: doc.monto, style: 'totalesValue' },
                    ],
                },
            ],
            margin: [0, 10, 0, 10],
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
        { text: 'GRACIAS POR SU PREFERENCIA', style: 'empresa', fontSize: 8, margin: [0, 10, 0, 0] },
    ]

    docDefinition.styles = {
        empresa: { fontSize: 10, alignment: 'center' },
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