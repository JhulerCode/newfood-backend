import axios from 'axios'
import config from '../../config.js'
import JSZip from "jszip"

const mifact_urls = {
    enviar: 'https://demo.mifact.net.pe/api/invoiceService.svc/SendInvoice', //Para Envio de documentos factura, boleta, nota de credito y debito
    anular: 'https://demo.mifact.net.pe/api/invoiceService.svc/LowInvoice', //Para Anular o dar de baja un documento
    estado: 'https://demo.mifact.net.pe/api/invoiceService.svc/GetEstatusInvoice', //Para Extraer el estado del documento, tanto del sistema mifact como el estado en sunat (estado_documento : 101 es en proceso, 102 aceptado, 103 es aceptado con observacion, 104 es rechazado por sunat, 105 es anulado, 108 es en solicitud de baja no enviado a sunat por el momento) 
    xml: 'https://demo.mifact.net.pe/api/invoiceService.svc/GetInvoice', //Para Extraer el pdf, xml enviado a sunat y el cdr respuesta sunat
    email: 'https://demo.mifact.net.pe/api/invoiceService.svc/SendMailInvoice', //Para Enviar correo electronico del documento electronico
}

async function sendDoc(doc) {
    const {
        empresa_datos, cliente_datos,
        doc_tipo, serie, numero, fecha_emision, hora_emision, fecha_vencimiento, tipo_operacion_sunat, moneda,
        gravado, exonerado, inafecto, gratuito, descuentos,
        igv, isc, icbper,
        monto, nota,
        nota_credito, nota_debito, docs_referenciado,
        items,
        mifact,
    } = doc

    let doc_tipo1
    if (doc_tipo.includes('NV')) {
        doc_tipo1 = 'NV'
    } else if (doc_tipo.includes('01')) {
        doc_tipo1 = '01'
    } else if (doc_tipo.includes('03')) {
        doc_tipo1 = '03'
    }
    
    const json_comprobante = {
        TOKEN: config.mifactApiKey,
        COD_TIP_NIF_EMIS: '6', //NO HAY
        // NUM_NIF_EMIS: empresa_datos.ruc,
        // NOM_RZN_SOC_EMIS: empresa_datos.razon_social,
        // COD_UBI_EMIS: empresa_datos.ubigeo,
        // TXT_DMCL_FISC_EMIS: empresa_datos.direccion_fiscal,
        "NUM_NIF_EMIS": "20100100100",
        "NOM_RZN_SOC_EMIS": "empresa demo",
        "NOM_COMER_EMIS": "mi nombre comercial es demo",
        "COD_UBI_EMIS": "103040",
        "TXT_DMCL_FISC_EMIS": "avenida abcd",

        COD_TIP_NIF_RECP: cliente_datos.doc_tipo,
        NUM_NIF_RECP: cliente_datos.doc_numero,
        NOM_RZN_SOC_RECP: cliente_datos.razon_social_nombres,

        FEC_EMIS: fecha_emision,
        COD_TIP_CPE: doc_tipo1,
        NUM_SERIE_CPE: serie,
        NUM_CORRE_CPE: numero,
        COD_MND: moneda,

        COD_TIP_OPE_SUNAT: tipo_operacion_sunat,
        TXT_VERS_UBL: "2.1",
        TXT_VERS_ESTRUCT_UBL: "2.0",
        COD_ANEXO_EMIS: empresa_datos.anexo,
    }

    // --- Campos opcionales del emisor --- //
    if (empresa_datos.nombre_comercial) {
        json_comprobante.NOM_COMER_EMIS = empresa_datos.nombre_comercial
    }

    // --- Campos opcionales del receptor --- //
    if (cliente_datos.direccion) {
        json_comprobante.TXT_DMCL_FISC_RECEP = cliente_datos.direccion
    }
    // if (txt_correo_envio) {
    //     json_comprobante.TXT_CORREO_ENVIO = txt_correo_envio
    // }
    // if (num_placa) {
    //     json_comprobante.NUM_PLACA = num_placa
    // }
    // if (txt_pais_recep) {
    //     json_comprobante.TXT_PAIS_RECEP = txt_pais_recep
    // }

    // --- Campos opcionales de documento --- //
    if (fecha_vencimiento) {
        json_comprobante.FEC_VENCIMIENTO = fecha_vencimiento
    }
    // if (tip_cambio) {
    //     json_comprobante.TIP_CAMBIO = tip_cambio //NO HAY
    // }
    // if (cod_pto_venta) {
    //     json_comprobante.COD_PTO_VENTA = cod_pto_venta
    // }

    // --- Notas de Crédito / Débito ---
    if (nota_credito) {
        json_comprobante.COD_TIP_NC = nota_credito.cod_tip_nc
        json_comprobante.TXT_DESC_MTVO = nota_credito.txt_desc_mtvo
    } else if (nota_debito) {
        json_comprobante.COD_TIP_ND = nota_debito.cod_tip_nd
        json_comprobante.TXT_DESC_MTVO = nota_debito.txt_desc_mtvo
    }

    if (docs_referenciado && docs_referenciado.length > 0) {
        json_comprobante.docs_referenciado = docs_referenciado.map(docRef => {
            return {
                COD_TIP_DOC_REF: docRef.cod_tip_doc_ref,
                NUM_SERIE_CPE_REF: docRef.num_serie_cpe_ref,
                NUM_CORRE_CPE_REF: docRef.num_corre_cpe_ref,
                FEC_DOC_REF: docRef.fec_doc_ref,
            }
        })
    }

    // --- Opciones de envío y retorno con valores por defecto --- //
    json_comprobante.COD_PRCD_CARGA = mifact.cod_prcd_carga != null ? mifact.cod_prcd_carga : "001"
    json_comprobante.ENVIAR_A_SUNAT = mifact.enviar_a_sunat != null ? mifact.enviar_a_sunat : false
    json_comprobante.RETORNA_XML_ENVIO = mifact.retorna_xml_envio != null ? mifact.retorna_xml_envio : false
    json_comprobante.RETORNA_XML_CDR = mifact.retorna_xml_cdr != null ? mifact.retorna_xml_cdr : false
    json_comprobante.RETORNA_PDF = mifact.retorna_pdf != null ? mifact.retorna_pdf : false
    json_comprobante.COD_FORM_IMPR = mifact.cod_form_impr != null ? mifact.cod_form_impr : "004"

    // --- Asignación de totales finales a la cabecera --- //
    json_comprobante.MNT_TOT_GRAVADO = Number(gravado).toFixed(2)
    json_comprobante.MNT_TOT_EXONERADO = Number(exonerado).toFixed(2)
    json_comprobante.MNT_TOT_INAFECTO = Number(inafecto).toFixed(2)
    json_comprobante.MNT_TOT_GRATUITO = Number(gratuito).toFixed(2)
    json_comprobante.MNT_TOT_DESCUENTO = Number(descuentos).toFixed(2)
    json_comprobante.MNT_TOT_TRIB_IGV = Number(igv).toFixed(2)
    if (isc > 0) json_comprobante.MNT_TOT_TRIB_ISC = Number(isc).toFixed(2) //NO HAY
    if (icbper > 0) json_comprobante.MNT_IMPUESTO_BOLSAS = Number(icbper).toFixed(2)
    json_comprobante.MNT_TOT = Number(monto).toFixed(2)

    // --- Items --- //
    json_comprobante.items = []
    for (const a of items) {
        calculateInvoiceLineValues(a)

        const item = {
            COD_ITEM: a.codigo,
            COD_UNID_ITEM: a.unidad,
            CANT_UNID_ITEM: a.cantidad,
            TXT_DESC_ITEM: a.descripcion,

            PRC_VTA_UNIT_ITEM: a.PRC_VTA_UNIT_ITEM.toFixed(2),
            VAL_UNIT_ITEM: a.VAL_UNIT_ITEM.toFixed(10),
            VAL_VTA_ITEM: a.VAL_VTA_ITEM.toFixed(2),
            MNT_BRUTO: a.MNT_BRUTO.toFixed(2),
            MNT_PV_ITEM: a.MNT_PV_ITEM.toFixed(2),

            COD_TIP_PRC_VTA: a.COD_TIP_PRC_VTA,
            COD_TIP_AFECT_IGV_ITEM: a.igv_afectacion,
            COD_TRIB_IGV_ITEM: a.COD_TRIB_IGV_ITEM,
            POR_IGV_ITEM: a.POR_IGV_ITEM.toFixed(2),
            MNT_IGV_ITEM: a.MNT_IGV_ITEM.toFixed(2),
        }

        // --- Agregar campos opcionales si tienen valor relevante --- //
        if (a.codigo_sunat && a.codigo_sunat != '') item.COD_ITEM_SUNAT = a.codigo_sunat
        if (a.MNT_DSCTO_ITEM > 0) item.MNT_DSCTO_ITEM = a.MNT_DSCTO_ITEM.toFixed(2)
        if (a.COD_TIP_SIST_ISC) {
            item.COD_TIP_SIST_ISC = a.COD_TIP_SIST_ISC.toFixed(2)
            item.MNT_ISC_ITEM = a.MNT_ISC_ITEM.toFixed(2)
            item.POR_ISC_ITEM = a.POR_ISC_ITEM
        }
        if (a.IMPUESTO_BOLSAS_UNIT > 0) item.IMPUESTO_BOLSAS_UNIT = a.IMPUESTO_BOLSAS_UNIT.toFixed(2)

        json_comprobante.items.push(item)
    }

    const res = await axios.post(mifact_urls.enviar, json_comprobante)

    return res.data
}

async function anularDoc(doc) {
    const { empresa_datos, fecha_emision, doc_tipo, serie, numero } = doc

    let doc_tipo1
    if (doc_tipo.includes('NV')) {
        doc_tipo1 = 'NV'
    } else if (doc_tipo.includes('01')) {
        doc_tipo1 = '01'
    } else if (doc_tipo.includes('03')) {
        doc_tipo1 = '03'
    }

    const send = {
        TOKEN: config.mifactApiKey,
        COD_TIP_NIF_EMIS: '6',
        // NUM_NIF_EMIS: empresa_datos.ruc,
        "NUM_NIF_EMIS": "20100100100",
        FEC_EMIS: fecha_emision,
        COD_TIP_CPE: doc_tipo1,
        NUM_SERIE_CPE: serie,
        NUM_CORRE_CPE: numero,
        TXT_DESC_MTVO: 'ANULACION POR ERROR',
        // COD_PTO_VENTA: "usuarioABCD" // usuario que solicita la anulacion
    }

    const res = await axios.post(mifact_urls.anular, send)

    return res.data
}

async function estadoDoc(doc) {
    const { empresa_datos, fecha_emision, doc_tipo, serie, numero } = doc

    let doc_tipo1
    if (doc_tipo.includes('NV')) {
        doc_tipo1 = 'NV'
    } else if (doc_tipo.includes('01')) {
        doc_tipo1 = '01'
    } else if (doc_tipo.includes('03')) {
        doc_tipo1 = '03'
    }

    const send = {
        TOKEN: config.mifactApiKey,
        // NUM_NIF_EMIS: empresa_datos.ruc,
        "NUM_NIF_EMIS": "20100100100",
        FEC_EMIS: fecha_emision,
        COD_TIP_CPE: doc_tipo1,
        NUM_SERIE_CPE: serie,
        NUM_CORRE_CPE: numero,
    }

    const res = await axios.post(mifact_urls.estado, send)

    return res.data
}

async function xmlDoc(doc) {
    const {
        empresa_datos, fecha_emision, doc_tipo, serie, numero,
        xml, cdr, pdf
    } = doc

    let doc_tipo1
    if (doc_tipo.includes('NV')) {
        doc_tipo1 = 'NV'
    } else if (doc_tipo.includes('01')) {
        doc_tipo1 = '01'
    } else if (doc_tipo.includes('03')) {
        doc_tipo1 = '03'
    }

    const send = {
        TOKEN: config.mifactApiKey,
        // NUM_NIF_EMIS: empresa_datos.ruc,
        "NUM_NIF_EMIS": "20100100100",
        FEC_EMIS: fecha_emision,
        COD_TIP_CPE: doc_tipo1,
        NUM_SERIE_CPE: serie,
        NUM_CORRE_CPE: numero,
        RETORNA_XML_ENVIO: xml != null ? xml : false,
        RETORNA_XML_CDR: cdr != null ? cdr : false,
        RETORNA_PDF: pdf != null ? pdf : false,
        COD_FORM_IMPR: '004',
    }

    const res = await axios.post(mifact_urls.xml, send)

    let file
    if (xml == true) {
        if (res.data.xml_enviado == '') return { code: 1, msg: 'No existe XML para este documento' }
        file = res.data.xml_enviado
    }
    else if (cdr == true) {
        if (res.data.cdr_sunat == '') return { code: 1, msg: 'No existe CDR para este documento' }
        file = res.data.cdr_sunat
    }

    // try {
    const buffer = Buffer.from(file, "base64")
    const zip = await JSZip.loadAsync(buffer)
    const fileEntry = Object.values(zip.files).find(f => !f.dir)
    if (!fileEntry) return { code: 1, mifact: res.data }
    const xmlBuffer = await fileEntry.async("nodebuffer")
    return { name: fileEntry.name, buffer: xmlBuffer }
    // }
    // catch (error) {
    //     return { code: 1, mifact: res.data, error }
    // }
}

const codigosAfectacionGratuitas = [
    '11', '12', '13', '14', '15', '16', // Gravado – Retiro por...
    '21', // Exonerado - Transferencia gratuita
    '31', '32', '33', '34', '35', '36', '37', // Inafecto – Retiro por... o Transferencia gratuita
]

function calculateInvoiceLineValues(item) {
    const cantidad = item.cantidad
    const pu = item.pu // Precio unitario de lista (con IGV/ISC)
    const igv_porcentaje = item.igv_porcentaje
    const igv_afectacion = item.igv_afectacion // Catálogo 07
    const descuento_tipo = item.descuento_tipo
    const descuento_valor = item.descuento_valor
    const bolsa_tax_unit_amount = item.has_bolsa_tax === true ? 0.5 : 0
    const isc_porcentaje = item.isc_porcentaje !== null ? item.isc_porcentaje : 0
    const isc_monto_fijo_uni =
        item.isc_monto_fijo_uni !== null ? item.isc_monto_fijo_uni : 0
    const ivap_porcentaje = item.ivap_porcentaje !== null ? item.ivap_porcentaje : 0

    // Tasas de impuestos en formato decimal
    const IGV_RATE_DECIMAL = igv_porcentaje / 100
    // const IVAP_RATE_DECIMAL = ivap_porcentaje / 100
    const ISC_RATE_DECIMAL = isc_porcentaje / 100

    // Variables para los cálculos intermedios y finales
    let val_unit_item_raw // VAL_UNIT_ITEM antes de descuentos de ítem, sin IGV/ISC
    let isc_unitario_calculated = 0 // ISC unitario para el cálculo de otros impuestos
    let cod_tip_sist_isc = null // Código de sistema de cálculo del ISC
    let por_isc_item_output = null // Porcentaje de ISC para el JSON final

    // 2. Determinar COD_TIP_PRC_VTA (Tipo de Precio de Venta)
    let cod_tip_prc_vta = '01' // Default: Precio unitario (incluye IGV)
    if (codigosAfectacionGratuitas.includes(igv_afectacion)) {
        cod_tip_prc_vta = '02'
    }

    // 3. Determinar COD_TRIB_IGV_ITEM y POR_IGV_ITEM para el JSON final
    let cod_trib_igv_item
    let por_igv_item_output // Porcentaje de IGV/IVAP para el JSON final
    let actual_igv_rate_for_calculation // Tasa de IGV/IVAP real para los cálculos

    switch (igv_afectacion) {
        case '10': // Gravado - Operación Onerosa
            cod_trib_igv_item = '1000'
            por_igv_item_output = igv_porcentaje
            actual_igv_rate_for_calculation = IGV_RATE_DECIMAL
            break
        case '17': // Gravado - IVAP
            cod_trib_igv_item = '1016'
            por_igv_item_output = ivap_porcentaje > 0 ? ivap_porcentaje : igv_porcentaje // Prioriza IVAP rate
            actual_igv_rate_for_calculation = por_igv_item_output / 100
            break
        case '20': // Exonerado - Operación Onerosa
            cod_trib_igv_item = '9997'
            por_igv_item_output = 0
            actual_igv_rate_for_calculation = 0
            break
        case '30': // Inafecto - Operación Onerosa
            cod_trib_igv_item = '9998'
            por_igv_item_output = 0
            actual_igv_rate_for_calculation = 0
            break
        case '40': // Exportación de Bienes o Servicios
            cod_trib_igv_item = '9995'
            por_igv_item_output = 0
            actual_igv_rate_for_calculation = 0
            break
        case '11':
        case '12':
        case '13':
        case '14':
        case '15':
        case '16': // Gravado – Retiro por... (Gratuito pero afecto a IGV por naturaleza)
            cod_trib_igv_item = '9996'
            por_igv_item_output = igv_porcentaje
            actual_igv_rate_for_calculation = IGV_RATE_DECIMAL
            break
        case '21':
        case '31':
        case '32':
        case '33':
        case '34':
        case '35':
        case '36':
        case '37': // Exonerado/Inafecto - Transferencia gratuita o retiro
            cod_trib_igv_item = '9996'
            por_igv_item_output = 0
            actual_igv_rate_for_calculation = 0
            break
        default:
            cod_trib_igv_item = '9998' // Default a Inafecto si no hay match claro
            por_igv_item_output = 0
            actual_igv_rate_for_calculation = 0
            break
    }

    // Determinar si el item está gravado con IGV/IVAP para cálculos de base imponible
    const isGravado = actual_igv_rate_for_calculation > 0

    // 4. Calcular VAL_UNIT_ITEM (val_unit_item_raw) y ISC unitario inicial, trabajando hacia atrás desde pu
    if (isc_monto_fijo_uni > 0) {
        // ISC por monto fijo unitario (Catálogo 08, código 02)
        cod_tip_sist_isc = '02'
        por_isc_item_output = 0 // No aplica porcentaje si es monto fijo unitario
        isc_unitario_calculated = isc_monto_fijo_uni // El ISC unitario es el monto fijo

        if (isGravado) {
            // pu = VU + ISC_fixed + (VU + ISC_fixed) * IGV_rate = (VU + ISC_fixed) * (1 + IGV_rate)
            val_unit_item_raw =
                pu / (1 + actual_igv_rate_for_calculation) - isc_unitario_calculated
        } else {
            // pu = VU + ISC_fixed
            val_unit_item_raw = pu - isc_unitario_calculated
        }
    } else if (isc_porcentaje > 0) {
        // ISC por porcentaje (ejemplo usa código 01)
        cod_tip_sist_isc = '01'
        por_isc_item_output = isc_porcentaje

        if (isGravado) {
            // pu = VU * (1 + ISC_rate) * (1 + IGV_rate)
            val_unit_item_raw =
                pu / ((1 + ISC_RATE_DECIMAL) * (1 + actual_igv_rate_for_calculation))
        } else {
            // pu = VU * (1 + ISC_rate)
            val_unit_item_raw = pu / (1 + ISC_RATE_DECIMAL)
        }
        isc_unitario_calculated = val_unit_item_raw * ISC_RATE_DECIMAL // Calcular ISC unitario basado en VAL_UNIT_ITEM_raw
    } else {
        // Sin ISC
        if (isGravado) {
            // pu = VU * (1 + IGV_rate)
            val_unit_item_raw = pu / (1 + actual_igv_rate_for_calculation)
        } else {
            // pu = VU
            val_unit_item_raw = pu
        }
    }

    // Asegurarse de que val_unit_item_raw no sea negativo
    if (val_unit_item_raw < 0) val_unit_item_raw = 0

    // 5. Calcular MNT_BRUTO (monto bruto del item antes de descuentos por item)
    // Este campo podría variar cuando se aplica un descuento para mostrar el valor original.
    const mnt_bruto_total = val_unit_item_raw * cantidad

    // 6. Aplicar descuentos por item al VAL_UNIT_ITEM_raw
    let monto_dscto_unitario_sin_igv = 0
    if (descuento_valor > 0) {
        if (descuento_tipo == 1) {
            // Descuento en monto del total de la línea (incluye todos los impuestos: IGV, ISC)
            let descuento_total_monetario = descuento_valor
            let descuento_total_sin_tributos // Este será el monto descontado sin ISC/IGV

            if (isc_monto_fijo_uni > 0) {
                // Caso 1: ISC por Monto Fijo Unitario (ej. Catálogo 08, código 02) [1]

                // 1. Quitar el efecto multiplicador del IGV:
                let desc_post_igv = descuento_total_monetario
                if (isGravado) {
                    // Dividir entre (1 + Tasa IGV)
                    desc_post_igv =
                        descuento_total_monetario / (1 + actual_igv_rate_for_calculation)
                }

                // 2. Quitar el componente total del ISC Fijo:
                // Descuento_Base_ISC = Descuento_post_IGV - (ISC_unitario_fijo * cantidad)
                const isc_total_fijo = isc_monto_fijo_uni * cantidad
                descuento_total_sin_tributos = Math.max(0, desc_post_igv - isc_total_fijo)
            } else if (isc_porcentaje > 0) {
                // Caso 2: ISC por Porcentaje (ej. Catálogo 08, código 01) [2]

                // 1. Calcular el factor de impuestos combinados: (1 + Tasa ISC) * (1 + Tasa IGV)
                let factor_impuestos = 1 + ISC_RATE_DECIMAL
                if (isGravado) {
                    factor_impuestos *= 1 + actual_igv_rate_for_calculation
                }

                // 2. Dividir el descuento total por el factor de impuestos combinados para obtener la base sin tributos:
                descuento_total_sin_tributos = descuento_total_monetario / factor_impuestos
            } else {
                // Caso 3: Solo IGV (o Exonerado/Inafecto Oneroso)
                descuento_total_sin_tributos = isGravado
                    ? descuento_total_monetario / (1 + actual_igv_rate_for_calculation)
                    : descuento_total_monetario
            }

            // Dividir el descuento total sin tributos por la cantidad para obtener el descuento unitario a la base (VAL_UNIT_ITEM)
            monto_dscto_unitario_sin_igv = descuento_total_sin_tributos / cantidad
        } else if (descuento_tipo == 2) {
            // Descuento en porcentaje
            monto_dscto_unitario_sin_igv = val_unit_item_raw * (descuento_valor / 100)
        }
    }
    // Asegurarse de que el descuento no haga el valor unitario negativo
    const val_unit_item_after_discount = Math.max(
        0,
        val_unit_item_raw - monto_dscto_unitario_sin_igv,
    )

    // 7. Recalcular ISC unitario final después del descuento del item (si es por porcentaje)
    let isc_unitario_final =
        isc_monto_fijo_uni > 0
            ? isc_monto_fijo_uni
            : isc_porcentaje > 0
                ? val_unit_item_after_discount * ISC_RATE_DECIMAL
                : 0

    // 8. Calcular IGV unitario final
    let mnt_igv_item_unitario_final = 0
    if (isGravado) {
        // MNT_IGV_ITEM = (VAL_UNIT_ITEM + MNT_ISC_ITEM) x POR_IGV_ITEM
        mnt_igv_item_unitario_final =
            (val_unit_item_after_discount + isc_unitario_final) *
            actual_igv_rate_for_calculation
    }

    // 9. Calcular PRC_VTA_UNIT_ITEM (precio de venta unitario final)
    const precio_venta_unitario_final =
        val_unit_item_after_discount +
        isc_unitario_final +
        mnt_igv_item_unitario_final +
        bolsa_tax_unit_amount

    // 10. Asignar al producto
    item.PRC_VTA_UNIT_ITEM = precio_venta_unitario_final // Precio del item incluido IGV
    item.VAL_UNIT_ITEM = val_unit_item_after_discount // Valor del item sin IGV
    item.VAL_VTA_ITEM = val_unit_item_after_discount * cantidad // Valor total del item sin IGV
    item.MNT_BRUTO = mnt_bruto_total // Monto bruto del item
    item.MNT_PV_ITEM = precio_venta_unitario_final * cantidad // Venta Total del ITEM incluido IGV, descuentos, cargos adicionales

    item.COD_TIP_PRC_VTA = cod_tip_prc_vta
    item.COD_TRIB_IGV_ITEM = cod_trib_igv_item // Código de tributo IGV/IVAP (Catálogo 05)
    item.POR_IGV_ITEM = por_igv_item_output // Tasa de IGV del item
    item.MNT_IGV_ITEM = mnt_igv_item_unitario_final * cantidad // IGV total del item

    item.MNT_DSCTO_ITEM = 0
    if (monto_dscto_unitario_sin_igv * cantidad > 0) {
        item.MNT_DSCTO_ITEM = monto_dscto_unitario_sin_igv * cantidad // Monto total del descuento del item sin IGV
    }
    if (isc_unitario_final > 0) {
        item.MNT_ISC_ITEM = isc_unitario_final * cantidad // ISC total del item
        item.POR_ISC_ITEM = por_isc_item_output // Porcentaje de ISC del item
        item.COD_TIP_SIST_ISC = cod_tip_sist_isc // Código de sistema de cálculo del ISC (Catálogo 08)
    }
    if (bolsa_tax_unit_amount > 0) {
        item.IMPUESTO_BOLSAS_UNIT = bolsa_tax_unit_amount // Impuesto a la bolsa unitario
    }

    const esOperacionGratuita = item.COD_TIP_PRC_VTA === '02'
    if (esOperacionGratuita) {
        item.valor_venta = 0.0
        item.igv = 0.0
        item.total = 0.0
    } else {
        item.valor_venta = item.VAL_VTA_ITEM
        item.igv = item.MNT_IGV_ITEM
        item.total = item.MNT_PV_ITEM
    }
}

export {
    sendDoc,
    anularDoc,
    estadoDoc,
    xmlDoc,
    calculateInvoiceLineValues,
}