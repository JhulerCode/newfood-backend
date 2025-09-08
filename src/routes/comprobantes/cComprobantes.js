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
import cSistema from "../_sistema/cSistema.js"
import { applyFilters, numeroATexto } from '../../utils/mine.js'
import { Mesa } from '../../database/models/Mesa.js'
import { Salon } from '../../database/models/Salon.js'
import { PagoMetodo } from '../../database/models/PagoMetodo.js'
import PdfPrinter from 'pdfmake'
import dayjs from "dayjs"

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

const create = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador } = req.user
        const {
            fecha, doc_tipo, socio, pago_condicion, estado, monto,
            total_gravada, total_exonerada, total_inafecta, total_igv,
            comprobante_items, transaccion, pago_metodos,
        } = req.body

        const empresa = await Empresa.findByPk('1')
        const cliente = await Socio.findByPk(socio)
        const pago_comprobante = await PagoComprobante.findByPk(doc_tipo)
        const caja_apertura = await CajaApertura.findOne({ where: { estado: '1' } })

        // --- VERIFY SI CAJA ESTÁ APERTURADA --- //
        if (caja_apertura == null) return res.json({ code: 1, msg: 'La caja no está aperturada' })

        // --- CREAR --- //
        const nuevo = await Comprobante.create({
            socio,
            pago_condicion,
            monto,
            transaccion: transaccion.id,
            caja_apertura: caja_apertura.id,
            estado,

            empresa_ruc: empresa.ruc,
            empresa_razon_social: empresa.razon_social,
            empresa_nombre_comercial: empresa.nombre_comercial,
            empresa_domicilio_fiscal: empresa.domicilio_fiscal,
            empresa_ubigeo: empresa.ubigeo,
            empresa_urbanizacion: empresa.urbanizacion,
            empresa_distrito: empresa.distrito,
            empresa_provincia: empresa.provincia,
            empresa_departamento: empresa.departamento,
            empresa_modo: '0', // NO SÉ

            cliente_razon_social_nombres: cliente.nombres,
            cliente_numero_documento: cliente.doc_numero,
            cliente_codigo_tipo_entidad: cliente.doc_tipo,
            cliente_cliente_direccion: cliente.direccion, // QUÉ PASA SI ES DNI

            venta_serie: pago_comprobante.serie,
            venta_numero: pago_comprobante.correlativo,
            venta_fecha_emision: fecha,
            venta_hora_emision: dayjs().format('HH:mm:ss'),
            venta_fecha_vencimiento: '',
            venta_moneda_id: '2', // NO SÉ
            venta_forma_pago_id: '1', // NO SÉ
            venta_total_gravada: total_gravada,
            venta_total_igv: total_igv,
            venta_total_exonerada: total_exonerada,
            venta_total_inafecta: total_inafecta,
            venta_tipo_documento_codigo: doc_tipo,
            venta_nota: '', // NO SÉ

            createdBy: colaborador
        }, { transaction })

        // --- GUARDAR ITEMS --- //
        const items = comprobante_items.map(a => ({
            articulo: a.articulo,
            pu: a.pu,
            igv_porcentaje: a.igv_porcentaje,
            descuento_tipo: a.descuento_tipo,
            descuento_valor: a.descuento_valor,

            producto: a.nombre,
            codigo_unidad: a.unidad,
            cantidad: a.cantidad,
            precio_base: a.vu, // CUANDO HAY DESCUENTO ES: a.vu - a.vu_desc
            tipo_igv_codigo: a.igv_afectacion,
            codigo_sunat: '-', // NO SÉ
            codigo_producto: '-',

            comprobante: nuevo.id,
            createdBy: colaborador
        }))
        await ComprobanteItem.bulkCreate(items, { transaction })

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
                                fecha,
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
                            fecha,
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
                            fecha,
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
                        fecha,
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
                fecha,
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
        res.json({ code: 0, data })
    }
    catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

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
                if (qry.cols.includes('venta_tipo_documento_codigo')) a.venta_tipo_documento_codigo1 = pago_comprobantes[a.venta_tipo_documento_codigo]
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

            data.tipo = pago_comprobantesMap[data.venta_tipo_documento_codigo]
            data.cliente_doc_tipo = documentos_identidadMap[data.cliente_codigo_tipo_entidad]
            data.pago_condicion1 = pago_condicionesMap[data.pago_condicion]
            data.venta_canal1 = venta_canalesMap[data.transaccion1.venta_canal]
        }

        makePdf(data, res)

        // res.json({ code: 0, data })
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
        const { venta_fecha_emision, caja_apertura, pago_metodos, modal_mode } = req.body

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
            fecha: modal_mode == 1 ? caja_apertura1.fecha_apertura : venta_fecha_emision,
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

        res.json({ code: 0 })

    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

function makePdf(doc, res) {
    // --- TABLE ITEMS --- //
    const dataRows = doc.comprobante_items.map((p) => [
        { text: p.producto, style: 'tableItem', noWrap: false }, // permite saltos de línea
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

    // --- SUBTOTAL --- //
    doc.subtotal = (
        Number(doc.venta_total_gravada) +
        Number(doc.venta_total_exonerada) +
        Number(doc.venta_total_inafecta)
    ).toFixed(2)

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

    // --- DEFINICIÓN DEL PDF --- //
    const docDefinition = {
        pageSize: {
            width: 80 * 2.83465,
            height: 'auto',
        },
        pageMargins: [5, 5, 5, 5],
    }

    docDefinition.content = [
        // --- EMPRESA --- //
        {
            stack: [
                doc.empresa_razon_social,
                `RUC: ${doc.empresa_ruc}`,
                doc.empresa_domicilio_fiscal,
                `TEL: ${doc.empresa_telefono}`,
            ],
            style: 'empresa',
        },
        // --- TIPO DE DOCUMENTO --- //
        {
            stack: [doc.tipo.nombre, `${doc.venta_serie}-${doc.venta_numero}`],
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
                    text: `CLIENTE: ${doc.cliente_razon_social_nombres}`,
                    style: 'datosExtra',
                },
                {
                    text: `${doc.cliente_doc_tipo.nombre}: ${doc.cliente_numero_documento}`,
                    style: 'datosExtra',
                },
                {
                    text: `DIRECCIÓN: ${doc.cliente_cliente_direccion}`,
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
                        { text: 'OPE. GRAVADAS:', style: 'totalesLabel' },
                        { text: doc.venta_total_gravada, style: 'totalesValue' },
                    ],
                },
                {
                    columns: [
                        { text: 'OPE. EXONERDAS:', style: 'totalesLabel' },
                        { text: doc.venta_total_exonerada, style: 'totalesValue' },
                    ],
                },
                {
                    columns: [
                        { text: 'OPE. INAFECTAS:', style: 'totalesLabel' },
                        { text: doc.venta_total_inafecta, style: 'totalesValue' },
                    ],
                },
                {
                    columns: [
                        { text: 'SUBTOTAL:', style: 'totalesLabel' },
                        { text: doc.subtotal, style: 'totalesValue' },
                    ],
                },
                {
                    columns: [
                        { text: 'IGV:', style: 'totalesLabel' },
                        { text: doc.venta_total_igv, style: 'totalesValue' },
                    ],
                },
                {
                    columns: [
                        { text: 'TOTAL:', style: 'totalesLabel' },
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
        // --- HASH COMPROBANTE SUNAT --- //
        { text: 'GRACIAS POR SU PREFERENCIA', style: 'empresa', margin: [0, 10, 0, 0] },
    ]

    docDefinition.styles = {
        empresa: { fontSize: 10, alignment: 'center' },
        tipo_doc: { fontSize: 11, alignment: 'center', bold: true, margin: [0, 10, 0, 10] },
        cliente_datos: { fontSize: 10, alignment: 'left', margin: [0, 0, 0, 10] },
        tableHeader: { fontSize: 10, bold: true, margin: [0, 0, 0, 1] },
        tableItem: { fontSize: 10, margin: [0, 0, 0, 1] },
        totalesLabel: { fontSize: 10, margin: [0, 0, 0, 1] },
        totalesValue: { fontSize: 10, alignment: 'right', margin: [0, 0, 0, 1] },
        datosExtra: { fontSize: 10, margin: [0, 0, 0, 1] },
    }

    const fonts = {
        Roboto: {
            normal: 'src/fonts/Roboto-Regular.ttf',
            bold: 'src/fonts/Roboto-Bold.ttf',
        }
    }

    const printer = new PdfPrinter(fonts)
    const pdfDoc = printer.createPdfKitDocument(docDefinition)
    let chunks = []
    pdfDoc.on('data', chunk => { chunks.push(chunk) })
    pdfDoc.on('end', () => {
        const result = Buffer.concat(chunks)
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `inline; filename=${doc.venta_serie}-${doc.venta_numero}.pdf`)
        res.send(result)
    })
    pdfDoc.end()
}

const canjear = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador } = req.user
        const { id } = req.params
        const {
            fecha, doc_tipo, socio
        } = req.body

        let comprobante = await Comprobante.findByPk(id, {
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

        const nuevo = await Comprobante.create({
            socio: socio,
            pago_condicion: comprobante.pago_condicion,
            monto: comprobante.monto,
            transaccion: comprobante.transaccion,
            caja_apertura: comprobante.caja_apertura,
            estado: 1,

            empresa_ruc: comprobante.ruc,
            empresa_razon_social: comprobante.razon_social,
            empresa_nombre_comercial: comprobante.nombre_comercial,
            empresa_domicilio_fiscal: comprobante.domicilio_fiscal,
            empresa_ubigeo: comprobante.ubigeo,
            empresa_urbanizacion: comprobante.urbanizacion,
            empresa_distrito: comprobante.distrito,
            empresa_provincia: comprobante.provincia,
            empresa_departamento: comprobante.departamento,
            empresa_modo: comprobante.empresa_modo,

            cliente_razon_social_nombres: cliente.nombres,
            cliente_numero_documento: cliente.doc_numero,
            cliente_codigo_tipo_entidad: cliente.doc_tipo,
            cliente_cliente_direccion: cliente.direccion,

            venta_serie: pago_comprobante.serie,
            venta_numero: pago_comprobante.correlativo,
            venta_fecha_emision: fecha,
            venta_hora_emision: dayjs().format('HH:mm:ss'),
            venta_fecha_vencimiento: '',
            venta_moneda_id: comprobante.venta_moneda_id,
            venta_forma_pago_id: comprobante.venta_forma_pago_id,
            venta_total_gravada: comprobante.total_gravada,
            venta_total_igv: comprobante.total_igv,
            venta_total_exonerada: comprobante.total_exonerada,
            venta_total_inafecta: comprobante.total_inafecta,
            venta_tipo_documento_codigo: doc_tipo,
            venta_nota: comprobante.venta_nota,

            createdBy: colaborador
        }, { transaction })

        // --- GUARDAR ITEMS --- //
        const items = comprobante.comprobante_items.map(a => ({
            articulo: a.articulo,
            pu: a.pu,
            igv_porcentaje: a.igv_porcentaje,
            descuento_tipo: a.descuento_tipo,
            descuento_valor: a.descuento_valor,

            producto: a.producto,
            codigo_unidad: a.codigo_unidad,
            cantidad: a.cantidad,
            precio_base: a.precio_base,
            tipo_igv_codigo: a.tipo_igv_codigo,
            codigo_sunat: a.codigo_sunat,
            codigo_producto: a.codigo_producto,

            comprobante: nuevo.id,
            createdBy: colaborador
        }))
        await ComprobanteItem.bulkCreate(items, { transaction })

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
            attributes: ['id', 'venta_fecha_emision', 'venta_tipo_documento_codigo', 'venta_serie', 'venta_numero', 'serie_correlativo', 'monto', 'pago_condicion', 'estado'],
            order: [['createdAt', 'ASC']],
            where: {},
            include: [
                {
                    model: ComprobanteItem,
                    as: 'comprobante_items',
                    attributes: ['id', 'articulo', 'producto', 'pu', 'descuento_tipo', 'descuento_valor', 'cantidad'],
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
            if (a.estado == 1) {
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
                const tKey = a.venta_tipo_documento_codigo
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
                            nombre: b.producto,
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
                const mes = dayjs(a.venta_fecha_emision).format("YYYY-MMM")
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

export default {
    create,
    find,
    findById,
    actualizarPago,
    anular,
    canjear,
    resumen,
}