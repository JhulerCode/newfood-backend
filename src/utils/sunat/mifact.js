import axios from 'axios'
import config from '../../config'
import cSistema from '../../routes/_sistema/cSistema'

const vars = {
    enviar: 'https://demo.mifact.net.pe/api/invoiceService.svc/SendInvoice', //Para Envio de documentos factura, boleta, nota de credito y debito
    anular: 'https://demo.mifact.net.pe/api/invoiceService.svc/LowInvoice', //Para Anular o dar de baja un documento
    estado: 'https://demo.mifact.net.pe/api/invoiceService.svc/GetEstatusInvoice', //Para Extraer el estado del documento, tanto del sistema mifact como el estado en sunat (estado_documento : 101 es en proceso, 102 aceptado, 103 es aceptado con observacion, 104 es rechazado por sunat, 105 es anulado, 108 es en solicitud de baja no enviado a sunat por el momento) 
    invoice: 'https://demo.mifact.net.pe/api/invoiceService.svc/GetInvoice', //Para Extraer el pdf, xml enviado a sunat y el cdr respuesta sunat
    email: 'https://demo.mifact.net.pe/api/invoiceService.svc/SendMailInvoice', //Para Enviar correo electronico del documento electronico
}

async function sendDoc(doc) {
    const {
        pago_condicion, monto,
        empresa, cliente,
        doc_tipo, serie, numero, fecha_emision, hora_emision, fecha_vencimiento,
        moneda,
        orden_compra, guias_adjuntas,
        items,
    } = doc

    const send = {
        "TOKEN": config.mifactApiKey,
        "COD_TIP_NIF_EMIS": "6",
        "NUM_NIF_EMIS": empresa.ruc,
        "NOM_RZN_SOC_EMIS": empresa.razon_social,
        "NOM_COMER_EMIS": empresa.nombre_comercial,
        "COD_UBI_EMIS": empresa.ubigeo,
        "TXT_DMCL_FISC_EMIS": empresa.direccion_fiscal,

        "COD_TIP_NIF_RECP": cliente.doc_tipo,
        "NUM_NIF_RECP": cliente.doc_numero,
        "NOM_RZN_SOC_RECP": cliente.razon_social_nombres,
        // "TXT_DMCL_FISC_RECEP": cliente.direccion,

        "FEC_EMIS": fecha_emision,
        // "FEC_VENCIMIENTO": "2018-09-19",
        "COD_TIP_CPE": doc_tipo, // tipo de documento 01 factura, 03 boleta, 07 nota de credito, 08 nota debito (sea electrónico o contingencias)
        "NUM_SERIE_CPE": serie, // serie del documento factura con F, boletas con B, contingencias con ceros a la izquierda hasta completar 4 digitos 
        "NUM_CORRE_CPE": numero,
        "COD_MND": moneda,
        // "TIP_CAMBIO": "1.000", // SI ES EN OTRA MONEDA DIFERENTE DE (PEN) ENVIAR EL TIPO DE CAMBIO HASTA 3 DECIMALES, SI ES (PEN) NO ES OBLIGATORIO ENVIAR ESTE FLAG

        // "TXT_CORREO_ENVIO": "mifact@outlook.com", // correo de tu cliente para que el sistema mifact envie despues
        "COD_PRCD_CARGA": "001",
        "MNT_TOT_GRAVADO": "1000.00",
        "MNT_TOT_TRIB_IGV": "180.00",
        "MNT_TOT": monto,
        // "COD_PTO_VENTA": "jmifact",
        "ENVIAR_A_SUNAT": "true",
        "RETORNA_XML_ENVIO": "true",
        "RETORNA_XML_CDR": "true",
        "RETORNA_PDF": "true",
        "COD_FORM_IMPR": "004",
        "TXT_VERS_UBL": "2.1",
        "TXT_VERS_ESTRUCT_UBL": "2.0",
        "COD_ANEXO_EMIS": "0000",
        "COD_TIP_OPE_SUNAT": "0101",
        "datos_adicionales": [
            {
                "COD_TIP_ADIC_SUNAT": "05", // codigo fijo para identificar observacion
                "TXT_DESC_ADIC_SUNAT": "texto para alguna observación"
            }
        ]
    }

    for (const a of items) {

    }

    const res = await axios.post(vars.enviar, send)

    return res.data
}

function generarJSONComprobante(comprobanteData) {
    const {
        pago_condicion, monto,
        empresa, cliente,
        doc_tipo, serie, numero, fecha_emision, hora_emision, fecha_vencimiento, moneda,
        tipo_operacion_sunat, anexo,
        orden_compra, guias_adjuntas, cuotas,
        items,
        nota_credito, nota_debito,
    } = comprobanteData

    const jsonOutput = {
        TOKEN: comprobanteData.token,
        COD_TIP_NIF_EMIS: "6",
        NUM_NIF_EMIS: empresa.ruc,
        NOM_RZN_SOC_EMIS: empresa.razon_social,
        COD_UBI_EMIS: empresa.ubigeo,
        TXT_DMCL_FISC_EMIS: empresa.direccion_fiscal,

        COD_TIP_NIF_RECP: cliente.doc_tipo,
        NUM_NIF_RECP: cliente.doc_numero,
        NOM_RZN_SOC_RECP: cliente.razon_social_nombres,

        FEC_EMIS: fecha_emision,
        COD_TIP_CPE: doc_tipo,
        NUM_SERIE_CPE: serie,
        NUM_CORRE_CPE: numero,
        COD_MND: moneda,

        // COD_PRCD_CARGA: comprobanteData.cod_prcd_carga,
        COD_TIP_OPE_SUNAT: tipo_operacion_sunat,
        TXT_VERS_UBL: "2.1",
        TXT_VERS_ESTRUCT_UBL: "2.0",
        COD_ANEXO_EMIS: anexo,
    };

    // --- Campos opcionales del emisor --- //
    if (empresa.nombre_comercial) {
        jsonOutput.NOM_COMER_EMIS = empresa.nombre_comercial
    }

    // --- Campos opcionales del receptor --- //
    // if (cliente.direccion) {
    //     jsonOutput.TXT_DMCL_FISC_RECEP = cliente.direccion;
    // }
    // if (comprobanteData.txt_correo_envio) {
    //     jsonOutput.TXT_CORREO_ENVIO = comprobanteData.txt_correo_envio;
    // }
    // if (comprobanteData.num_placa) {
    //     jsonOutput.NUM_PLACA = comprobanteData.num_placa;
    // }
    // if (comprobanteData.txt_pais_recep) {
    //     jsonOutput.TXT_PAIS_RECEP = comprobanteData.txt_pais_recep;
    // }

    // --- Campos opcionales de documento --- //
    if (fecha_vencimiento) {
        jsonOutput.FEC_VENCIMIENTO = fecha_vencimiento
    }
    // if (comprobanteData.tip_cambio) {
    //     jsonOutput.TIP_CAMBIO = comprobanteData.tip_cambio
    // }
    // if (comprobanteData.cod_pto_venta) {
    //     jsonOutput.COD_PTO_VENTA = comprobanteData.cod_pto_venta
    // }

    // --- Opciones de envío y retorno con valores por defecto --- //
    jsonOutput.ENVIAR_A_SUNAT = comprobanteData.enviar_a_sunat !== undefined ? comprobanteData.enviar_a_sunat : true;
    jsonOutput.RETORNA_XML_ENVIO = comprobanteData.retorna_xml_envio !== undefined ? comprobanteData.retorna_xml_envio : true;
    jsonOutput.RETORNA_XML_CDR = comprobanteData.retorna_xml_cdr !== undefined ? comprobanteData.retorna_xml_cdr : true;
    jsonOutput.RETORNA_PDF = comprobanteData.retorna_pdf !== undefined ? comprobanteData.retorna_pdf : true;
    jsonOutput.COD_FORM_IMPR = comprobanteData.cod_form_impr != undefined ? comprobanteData.cod_form_impr : "004";

    // --- Procesamiento de ítems y acumulación de totales ---
    let itemsJSONGenerados = [];
    let rawTotalGravadoItems = 0;
    let rawTotalExoneradoItems = 0;
    let rawTotalInafectoItems = 0;
    let rawTotalGratuitoItems = 0;
    let rawTotalIgvItems = 0;
    let rawTotalIscItems = 0;
    let rawTotalDescuentoItems = 0; // Descuentos por ítem
    let rawTotalImpuestoBolsasItems = 0;

    // Catálogo 07 para identificar ítems gratuitos
    const codigosAfectacionGratuitas = [
        11, 12, 13, 14, 15, 16, // Gravado – Retiro por...
        21, // Exonerado - Transferencia gratuita
        31, 32, 33, 34, 35, 36, 37 // Inafecto – Retiro por... o Transferencia gratuita
    ];
    // Catálogo 07 para identificar ítems inafectos (operación onerosa)
    const codigosAfectacionInafectoOneroso = [30, 31, 32, 33, 34, 35, 36]; // 30: Inafecto - Operación Onerosa, 40: Exportación de Bienes o Servicios

    items.forEach(item => {
        const itemJSON = generarItemJSON(item);
        itemsJSONGenerados.push(itemJSON);

        const valVtaItem = parseFloat(itemJSON.VAL_VTA_ITEM);
        const mntIgvItem = parseFloat(itemJSON.MNT_IGV_ITEM || '0.00');
        const mntIscItem = parseFloat(itemJSON.MNT_ISC_ITEM || '0.00');
        const mntDsctoItem = parseFloat(itemJSON.MNT_DSCTO_ITEM || '0.00');
        const impBolsaUnit = parseFloat(itemJSON.IMPUESTO_BOLSAS_UNIT || '0.00');
        const cantUnidItem = parseFloat(itemJSON.CANT_UNID_ITEM);

        // Suma de impuestos de todos los ítems
        rawTotalIgvItems += mntIgvItem;
        rawTotalIscItems += mntIscItem;
        rawTotalDescuentoItems += mntDsctoItem;
        rawTotalImpuestoBolsasItems += (impBolsaUnit * cantUnidItem); //

        // Separación de bases imponibles (gravado, exonerado, inafecto, gratuito)
        const igvAfectacion = parseInt(itemJSON.COD_TIP_AFECT_IGV_ITEM); //
        if (codigosAfectacionGratuitas.includes(igvAfectacion)) { //
            rawTotalGratuitoItems += valVtaItem;
        } else if (igvAfectacion === 10 || igvAfectacion === 17) { // Gravado
            rawTotalGravadoItems += valVtaItem;
        } else if (igvAfectacion === 20) { // Exonerado
            rawTotalExoneradoItems += valVtaItem;
        } else if (codigosAfectacionInafectoOneroso.includes(igvAfectacion)) { // Inafecto
            rawTotalInafectoItems += valVtaItem;
        }
    });

    // --- Aplicar ajustes globales que modifican las bases antes de establecer los totales de cabecera ---

    // 1. Aplicar Anticipos (reducen las bases y sus impuestos)
    if (comprobanteData.anticipos_info && comprobanteData.anticipos_info.mnt_tot_antcp > 0) { //
        const totalAnticipoBase = comprobanteData.anticipos_info.mnt_tot_antcp; //
        const codTipDsctoAnt = comprobanteData.anticipos_info.cod_tip_dscto_ant; //
        const igvPorcentajeGlobal = comprobanteData.igv_porcentaje_global !== undefined ? comprobanteData.igv_porcentaje_global / 100 : 0.18; // Usar una tasa global si no se provee.

        if (codTipDsctoAnt === "04") { // Anticipo afecto/gravado al IGV
            const totalAnticipoIGV = totalAnticipoBase * igvPorcentajeGlobal; //
            rawTotalGravadoItems -= totalAnticipoBase;
            rawTotalIgvItems -= totalAnticipoIGV;
        } else if (codTipDsctoAnt === "05") { // Anticipo para exonerado
            rawTotalExoneradoItems -= totalAnticipoBase;
        } else if (codTipDsctoAnt === "06") { // Anticipo para inafectos
            rawTotalInafectoItems -= totalAnticipoBase;
        }
        // Incluir el tag de anticipo global para la cabecera
        jsonOutput.MNT_TOT_ANTCP = totalAnticipoBase.toFixed(2); //
        jsonOutput.COD_TIP_DSCTO = codTipDsctoAnt; //

        // Incluir detalles de anticipos si existen
        if (comprobanteData.anticipos_info.detalles && comprobanteData.anticipos_info.detalles.length > 0) { //
            jsonOutput.anticipos = comprobanteData.anticipos_info.detalles.map(ant => ({
                NUM_LIN_ANTCP: ant.num_lin_antcp, //
                FEC_ANTICIPO: ant.fec_anticipo, //
                MNT_ANTCP: ant.mnt_antcp.toFixed(2), //
                COD_TIP_DOC_ANTCP: ant.cod_tip_doc_antcp, //
                NUM_SERIE_CPE_ANTCP: ant.num_serie_cpe_antcp, //
                NUM_CORRE_CPE_ANTCP: ant.num_corre_cpe_antcp //
            }));
        }
    }

    // 2. Aplicar Descuento Global (reduce la base gravada y su IGV si aplica)
    if (comprobanteData.mnt_dscto_glob && comprobanteData.mnt_dscto_glob > 0) { //
        const descuentoGlobalBase = comprobanteData.mnt_dscto_glob; //
        // Ejemplo sugiere que el descuento global se aplica a la base gravada.
        if (rawTotalGravadoItems > 0) {
            const factorReduccion = descuentoGlobalBase / rawTotalGravadoItems;
            rawTotalGravadoItems -= descuentoGlobalBase;
            rawTotalIgvItems -= rawTotalIgvItems * factorReduccion;
        } else if (rawTotalExoneradoItems > 0) { // Podría aplicarse a exonerados si no hay gravados
            rawTotalExoneradoItems -= descuentoGlobalBase;
        } else if (rawTotalInafectoItems > 0) { // Podría aplicarse a inafectos si no hay gravados ni exonerados
            rawTotalInafectoItems -= descuentoGlobalBase;
        }

        jsonOutput.MNT_DSCTO_GLOB = descuentoGlobalBase.toFixed(2); //
        if (comprobanteData.cod_tip_dscto_glob) { //
            jsonOutput.COD_TIP_DSCTO = comprobanteData.cod_tip_dscto_glob; // Si hay anticipo, este sobrescribe el COD_TIP_DSCTO del anticipo. Se debe manejar la prioridad si ambos aplican. Por simplicidad, el último que se asigna prevalece.
        }
    }

    // Asegurarse de que los totales no sean negativos después de descuentos/anticipos
    rawTotalGravadoItems = Math.max(0, rawTotalGravadoItems);
    rawTotalExoneradoItems = Math.max(0, rawTotalExoneradoItems);
    rawTotalInafectoItems = Math.max(0, rawTotalInafectoItems);
    rawTotalIgvItems = Math.max(0, rawTotalIgvItems);

    // --- Asignación de totales finales a la cabecera ---
    jsonOutput.MNT_TOT_GRAVADO = rawTotalGravadoItems.toFixed(2); //
    jsonOutput.MNT_TOT_EXONERADO = rawTotalExoneradoItems.toFixed(2); //
    jsonOutput.MNT_TOT_INAFECTO = rawTotalInafectoItems.toFixed(2); //
    jsonOutput.MNT_TOT_GRATUITO = rawTotalGratuitoItems.toFixed(2); //
    jsonOutput.MNT_TOT_DESCUENTO = rawTotalDescuentoItems.toFixed(2); //
    jsonOutput.MNT_TOT_TRIB_IGV = rawTotalIgvItems.toFixed(2); //
    if (rawTotalIscItems > 0) { //
        jsonOutput.MNT_TOT_TRIB_ISC = rawTotalIscItems.toFixed(2);
    }
    if (rawTotalImpuestoBolsasItems > 0) { //
        jsonOutput.MNT_IMPUESTO_BOLSAS = rawTotalImpuestoBolsasItems.toFixed(2);
    }

    // Recargo Global (se suma directamente al MNT_TOT final)
    const mntTotOtrCgo = comprobanteData.mnt_tot_otr_cgo !== undefined ? parseFloat(comprobanteData.mnt_tot_otr_cgo) : 0; //
    if (mntTotOtrCgo > 0) {
        jsonOutput.MNT_TOT_OTR_CGO = mntTotOtrCgo.toFixed(2); //
        if (comprobanteData.cod_tip_cargo_glob) { //
            jsonOutput.COD_TIP_CARGO = comprobanteData.cod_tip_cargo_glob;
        }
    }

    // Cálculo del Monto Total del Documento (MNT_TOT)
    let mntTotCalculado =
        parseFloat(jsonOutput.MNT_TOT_GRAVADO) +
        parseFloat(jsonOutput.MNT_TOT_EXONERADO) +
        parseFloat(jsonOutput.MNT_TOT_INAFECTO) +
        parseFloat(jsonOutput.MNT_TOT_TRIB_IGV) +
        parseFloat(jsonOutput.MNT_TOT_TRIB_ISC || '0.00') + // Incluir ISC si existe
        parseFloat(jsonOutput.MNT_IMPUESTO_BOLSAS || '0.00') + // Incluir Impuesto a la Bolsa si existe
        mntTotOtrCgo; // Incluir recargo global

    // Si hay anticipo, MNT_TOT_ANTCP ya redujo las bases y los IGV/ISC.
    // Si hay descuento global, MNT_DSCTO_GLOB ya redujo las bases y los IGV/ISC.

    jsonOutput.MNT_TOT = mntTotCalculado.toFixed(2); //

    // --- Casuísticas especiales de Notas de Crédito/Débito tipo 03/13 ---
    const isNotaCreditoCorreccion = comprobanteData.nota_credito && (comprobanteData.nota_credito.cod_tip_nc === "03" || comprobanteData.nota_credito.cod_tip_nc === "13"); //

    if (isNotaCreditoCorreccion) {
        // Para NC tipo 03 o 13, los montos totales y de ítems deben ser "0.00"
        jsonOutput.MNT_TOT_GRAVADO = "0.00"; //
        jsonOutput.MNT_TOT_EXONERADO = "0.00"; // No siempre en la doc, pero por lógica.
        jsonOutput.MNT_TOT_INAFECTO = "0.00"; // No siempre en la doc, pero por lógica.
        jsonOutput.MNT_TOT_GRATUITO = "0.00"; // No siempre en la doc, pero por lógica.
        jsonOutput.MNT_TOT_DESCUENTO = "0.00"; // No siempre en la doc, pero por lógica.
        jsonOutput.MNT_TOT_TRIB_IGV = "0.00"; //
        jsonOutput.MNT_TOT_TRIB_ISC = "0.00"; // Por lógica, si los demás son 0
        jsonOutput.MNT_IMPUESTO_BOLSAS = "0.00"; // Por lógica
        jsonOutput.MNT_TOT = "0.00"; //

        // También los montos en los ítems deben ser "0.00"
        itemsJSONGenerados = itemsJSONGenerados.map(item => ({
            ...item,
            VAL_UNIT_ITEM: "0.0000000000",
            PRC_VTA_UNIT_ITEM: "0.00",
            VAL_VTA_ITEM: "0.00",
            MNT_BRUTO: "0.00",
            MNT_PV_ITEM: "0.00",
            MNT_DSCTO_ITEM: "0.00",
            MNT_ISC_ITEM: "0.00",
            MNT_IGV_ITEM: "0.00",
            IMPUESTO_BOLSAS_UNIT: "0.00",
        }));
    }

    // --- Datos de Detracción ---
    if (comprobanteData.detraccion) { //
        jsonOutput.MNT_TOT_DETRACCION = comprobanteData.detraccion.mnt_tot_detraccion.toFixed(2); //
        jsonOutput.POR_DETRACCION = comprobanteData.detraccion.por_detraccion.toFixed(2); //
        jsonOutput.NRO_CUENTA_DETRAC = comprobanteData.detraccion.nro_cuenta_detrac; //
        jsonOutput.COD_TIP_DETRACCION = comprobanteData.detraccion.cod_tip_detraccion; //

        // Monto Pendiente (MNT_TOT - MNT_TOT_DETRACCION)
        jsonOutput.MNT_PENDIENTE = (parseFloat(jsonOutput.MNT_TOT) - parseFloat(jsonOutput.MNT_TOT_DETRACCION)).toFixed(2); //
    }

    // --- Datos de Retención ---
    if (comprobanteData.retencion) { //
        jsonOutput.MNT_TOT_OTR_CGO = comprobanteData.retencion.mnt_tot_retencion.toFixed(2); // Usado para el monto de retención
        jsonOutput.COD_TIP_CARGO = comprobanteData.retencion.cod_tip_cargo_retencion; //

        // Monto Pendiente (MNT_TOT - MNT_TOT_RETENCION)
        // Si ya hay detracción, se resta también la retención. Si no hay, se calcula solo con retención.
        let mntPendienteBase = parseFloat(jsonOutput.MNT_TOT);
        if (jsonOutput.MNT_TOT_DETRACCION) {
            mntPendienteBase -= parseFloat(jsonOutput.MNT_TOT_DETRACCION);
        }
        jsonOutput.MNT_PENDIENTE = (mntPendienteBase - parseFloat(jsonOutput.MNT_TOT_OTR_CGO)).toFixed(2); //
    }

    // Si no hay detracción ni retención pero es una factura a crédito, también puede haber MNT_PENDIENTE
    if (!jsonOutput.MNT_PENDIENTE && (comprobanteData.fec_vencimiento || cuotas)) {
        jsonOutput.MNT_PENDIENTE = parseFloat(jsonOutput.MNT_TOT).toFixed(2); // Es el total del documento si no hay detracción/retención
    }

    // --- Cuotas (para crédito con múltiples cuotas) ---
    if (cuotas && cuotas.length > 0) { //
        jsonOutput.cuotas = comprobanteData.cuotas.map(cuota => ({
            NRO_CUOTA: cuota.nro_cuota, //
            FECHA_CUOTA: cuota.fecha_cuota, //
            MONTO_CUOTA: cuota.monto_cuota.toFixed(2) //
        }));
    }

    // --- Notas de Crédito / Débito ---
    if (comprobanteData.nota_credito) { //
        jsonOutput.COD_TIP_NC = comprobanteData.nota_credito.cod_tip_nc; //
        jsonOutput.TXT_DESC_MTVO = comprobanteData.nota_credito.txt_desc_mtvo; //
    } else if (comprobanteData.nota_debito) { //
        jsonOutput.COD_TIP_ND = comprobanteData.nota_debito.cod_tip_nd; //
        jsonOutput.TXT_DESC_MTVO = comprobanteData.nota_debito.txt_desc_mtvo; //
    }

    // --- Documentos Referenciados (para NC/ND) ---
    if (comprobanteData.docs_referenciado && comprobanteData.docs_referenciado.length > 0) { //
        jsonOutput.docs_referenciado = comprobanteData.docs_referenciado.map(docRef => {
            const docRefJSON = {
                COD_TIP_DOC_REF: docRef.cod_tip_doc_ref, //
                NUM_SERIE_CPE_REF: docRef.num_serie_cpe_ref, //
                NUM_CORRE_CPE_REF: docRef.num_corre_cpe_ref //
            };
            if (docRef.fec_doc_ref) { //
                docRefJSON.FEC_DOC_REF = docRef.fec_doc_ref; //
            }
            return docRefJSON;
        });
    }

    // --- Guías de Remisión ---
    if (guias_adjuntas && guias_adjuntas.length > 0) { //
        jsonOutput.guias = guias_adjuntas.map(guia => ({
            COD_TIP_DOC_REF: guia.cod_tip_doc_ref, //
            NUM_SERIE_CPE_REF: guia.num_serie_cpe_ref, //
            NUM_CORRE_CPE_REF: guia.num_corre_cpe_ref //
        }));
    }

    // --- Otros Documentos Referenciados (no Catálogo 01) ---
    if (comprobanteData.otro_docs_referenciado && comprobanteData.otro_docs_referenciado.length > 0) { //
        jsonOutput.otro_docs_referenciado = comprobanteData.otro_docs_referenciado.map(otroDoc => ({
            COD_TIP_OTR_DOC_REF: otroDoc.cod_tip_otr_doc_ref, // "99"
            NUM_OTR_DOC_REF: otroDoc.num_otr_doc_ref //
        }));
    }

    // --- Datos Adicionales ---
    if (comprobanteData.datos_adicionales && comprobanteData.datos_adicionales.length > 0) { //
        jsonOutput.datos_adicionales = comprobanteData.datos_adicionales.map(dato => ({
            COD_TIP_ADIC_SUNAT: dato.cod_tip_adic_sunat, //
            TXT_DESC_ADIC_SUNAT: dato.txt_desc_adic_sunat //
        }));
    }

    // --- Datos de Transporte (para Detracción 027) ---
    if (comprobanteData.transporte && comprobanteData.transporte.length > 0) { //
        jsonOutput.transporte = comprobanteData.transporte.map(tran => {
            const transporteJSON = {
                COD_UBI_PRTD: tran.cod_ubi_prtd, //
                TXT_DMCL_FISC_PRTD: tran.txt_dmcl_fisc_prtd, //
                COD_UBI_LLGD: tran.cod_ubi_llgd, //
                TXT_DMCL_FISC_LLGD: tran.txt_dmcl_fisc_llgd, //
            };
            if (tran.detalle_viaje) transporteJSON.DETALLE_VIAJE = tran.detalle_viaje; //
            if (tran.valor_ref_serv_transp) transporteJSON.VALOR_REF_SERV_TRANSP = tran.valor_ref_serv_transp.toFixed(2); //
            if (tran.valor_ref_carga_efect) transporteJSON.VALOR_REF_CARGA_EFECT = tran.valor_ref_carga_efect.toFixed(2); //
            if (tran.valor_ref_carga_util) transporteJSON.VALOR_REF_CARGA_UTIL = tran.valor_ref_carga_util.toFixed(2); //
            return transporteJSON;
        });
    }

    jsonOutput.items = itemsJSONGenerados; // Asigna los ítems generados al JSON final

    return jsonOutput;
}

function generarItemJSON(item) {
    // 1. Parsear y validar inputs, establecer defaults
    const descripcion = item.descripcion;
    const unidad = item.unidad;
    // COD_ITEM_SUNAT es obligatorio para exportación y será para todas las ventas desde 2020.
    const codigo_sunat = item.codigo_sunat && item.codigo_sunat !== '-' ? item.codigo_sunat : null;
    const codigo = item.codigo;
    const cantidad = parseFloat(item.cantidad);
    const pu_input = parseFloat(item.pu); // Precio unitario de lista (con IGV/ISC)
    const igv_porcentaje_input = item.igv_porcentaje !== null ? parseFloat(item.igv_porcentaje) : 18; // Default 18%
    const igv_afectacion_input = parseInt(item.igv_afectacion); // Catálogo 07
    const descuento_tipo = item.descuento_tipo;
    const descuento_valor = item.descuento_valor !== null ? parseFloat(item.descuento_valor) : 0;
    const has_bolsa_tax_unit_amount = item.has_bolsa_tax === true ? 0.5 : 0;
    const isc_porcentaje_input = item.isc_porcentaje !== null ? parseFloat(item.isc_porcentaje) : 0;
    const isc_monto_fijo_unitario_input = item.isc_monto_fijo_unitario !== null ? parseFloat(item.isc_monto_fijo_unitario) : 0;
    const ivap_porcentaje_input = item.ivap_porcentaje !== null ? parseFloat(item.ivap_porcentaje) : 0;

    // Tasas de impuestos en formato decimal
    const IGV_RATE_DECIMAL = igv_porcentaje_input / 100;
    const IVAP_RATE_DECIMAL = ivap_porcentaje_input / 100;
    const ISC_RATE_DECIMAL = isc_porcentaje_input / 100;

    // Variables para los cálculos intermedios y finales
    let val_unit_item_raw; // VAL_UNIT_ITEM antes de descuentos de ítem, sin IGV/ISC
    let isc_unitario_calculated = 0; // ISC unitario para el cálculo de otros impuestos
    let cod_tip_sist_isc = null; // Código de sistema de cálculo del ISC
    let por_isc_item_output = null; // Porcentaje de ISC para el JSON final

    // 2. Determinar COD_TIP_PRC_VTA (Tipo de Precio de Venta)
    let cod_tip_prc_vta = "01"; // Default: Precio unitario (incluye IGV)
    // Se usa '02' para operaciones gratuitas o no onerosas
    // Lista de códigos de afectación del IGV (Catálogo 07) que corresponden a operaciones gratuitas/retiros
    const codigosAfectacionGratuitas = [
        11, 12, 13, 14, 15, 16, // Gravado – Retiro por...
        21, // Exonerado - Transferencia gratuita
        31, 32, 33, 34, 35, 36, 37 // Inafecto – Retiro por... o Transferencia gratuita
    ];

    if (codigosAfectacionGratuitas.includes(igv_afectacion_input)) {
        cod_tip_prc_vta = "02";
    }

    // 3. Determinar COD_TRIB_IGV_ITEM y POR_IGV_ITEM para el JSON final
    let cod_trib_igv_item;
    let por_igv_item_output; // Porcentaje de IGV/IVAP para el JSON final
    let actual_igv_rate_for_calculation; // Tasa de IGV/IVAP real para los cálculos

    switch (igv_afectacion_input) {
        case 10: // Gravado - Operación Onerosa
            cod_trib_igv_item = "1000";
            por_igv_item_output = igv_porcentaje_input;
            actual_igv_rate_for_calculation = IGV_RATE_DECIMAL;
            break;
        case 17: // Gravado - IVAP
            cod_trib_igv_item = "1016";
            por_igv_item_output = ivap_porcentaje_input > 0 ? ivap_porcentaje_input : igv_porcentaje_input; // Prioriza IVAP rate
            actual_igv_rate_for_calculation = por_igv_item_output / 100;
            break;
        case 20: // Exonerado - Operación Onerosa
            cod_trib_igv_item = "9997";
            por_igv_item_output = 0;
            actual_igv_rate_for_calculation = 0;
            break;
        case 30: // Inafecto - Operación Onerosa
            cod_trib_igv_item = "9998";
            por_igv_item_output = 0;
            actual_igv_rate_for_calculation = 0;
            break;
        case 40: // Exportación de Bienes o Servicios
            cod_trib_igv_item = "9995";
            por_igv_item_output = 0;
            actual_igv_rate_for_calculation = 0;
            break;
        case 11: case 12: case 13: case 14: case 15: case 16: // Gravado – Retiro por... (Gratuito pero afecto a IGV por naturaleza)
            cod_trib_igv_item = "9996";
            por_igv_item_output = igv_porcentaje_input;
            actual_igv_rate_for_calculation = IGV_RATE_DECIMAL;
            break;
        case 21: case 31: case 32: case 33: case 34: case 35: case 36: case 37: // Exonerado/Inafecto - Transferencia gratuita o retiro
            cod_trib_igv_item = "9996";
            por_igv_item_output = 0;
            actual_igv_rate_for_calculation = 0;
            break;
        default:
            cod_trib_igv_item = "9998"; // Default a Inafecto si no hay match claro
            por_igv_item_output = 0;
            actual_igv_rate_for_calculation = 0;
            break;
    }

    // Determinar si el item está gravado con IGV/IVAP para cálculos de base imponible
    const isGravado = actual_igv_rate_for_calculation > 0;

    // 4. Calcular VAL_UNIT_ITEM (val_unit_item_raw) y ISC unitario inicial, trabajando hacia atrás desde pu_input
    if (isc_monto_fijo_unitario_input > 0) {
        // ISC por monto fijo unitario (Catálogo 08, código 02)
        cod_tip_sist_isc = "02";
        por_isc_item_output = 0; // No aplica porcentaje si es monto fijo unitario
        isc_unitario_calculated = isc_monto_fijo_unitario_input; // El ISC unitario es el monto fijo

        if (isGravado) {
            // pu_input = VU + ISC_fixed + (VU + ISC_fixed) * IGV_rate = (VU + ISC_fixed) * (1 + IGV_rate)
            val_unit_item_raw = (pu_input / (1 + actual_igv_rate_for_calculation)) - isc_unitario_calculated;
        } else {
            // pu_input = VU + ISC_fixed
            val_unit_item_raw = pu_input - isc_unitario_calculated;
        }
    } else if (isc_porcentaje_input > 0) {
        // ISC por porcentaje (ejemplo usa código 01)
        cod_tip_sist_isc = "01";
        por_isc_item_output = isc_porcentaje_input;

        if (isGravado) {
            // pu_input = VU * (1 + ISC_rate) * (1 + IGV_rate)
            val_unit_item_raw = pu_input / ((1 + ISC_RATE_DECIMAL) * (1 + actual_igv_rate_for_calculation));
        } else {
            // pu_input = VU * (1 + ISC_rate)
            val_unit_item_raw = pu_input / (1 + ISC_RATE_DECIMAL);
        }
        isc_unitario_calculated = val_unit_item_raw * ISC_RATE_DECIMAL; // Calcular ISC unitario basado en VAL_UNIT_ITEM_raw

    } else {
        // Sin ISC
        if (isGravado) {
            // pu_input = VU * (1 + IGV_rate)
            val_unit_item_raw = pu_input / (1 + actual_igv_rate_for_calculation);
        } else {
            // pu_input = VU
            val_unit_item_raw = pu_input;
        }
    }

    // Asegurarse de que val_unit_item_raw no sea negativo
    if (val_unit_item_raw < 0) val_unit_item_raw = 0;

    // 5. Calcular MNT_BRUTO (monto bruto del item antes de descuentos por item)
    // Este campo podría variar cuando se aplica un descuento para mostrar el valor original.
    const mnt_bruto_total = val_unit_item_raw * cantidad;

    // 6. Aplicar descuentos por item al VAL_UNIT_ITEM_raw
    let monto_dscto_unitario_sin_igv = 0;
    if (descuento_valor > 0) {
        if (descuento_tipo === 1) { // Descuento en monto del total de la línea
            monto_dscto_unitario_sin_igv = descuento_valor / cantidad;
        } else if (descuento_tipo === 2) { // Descuento en porcentaje
            monto_dscto_unitario_sin_igv = val_unit_item_raw * (descuento_valor / 100);
        }
    }
    // Asegurarse de que el descuento no haga el valor unitario negativo
    const val_unit_item_after_discount = Math.max(0, val_unit_item_raw - monto_dscto_unitario_sin_igv);

    // 7. Recalcular ISC unitario final después del descuento del item (si es por porcentaje)
    let isc_unitario_final = isc_monto_fijo_unitario_input > 0 ? isc_monto_fijo_unitario_input : (isc_porcentaje_input > 0 ? val_unit_item_after_discount * ISC_RATE_DECIMAL : 0);

    // 8. Calcular IGV unitario final
    let mnt_igv_item_unitario_final = 0;
    if (isGravado) {
        // MNT_IGV_ITEM = (VAL_UNIT_ITEM + MNT_ISC_ITEM) x POR_IGV_ITEM
        mnt_igv_item_unitario_final = (val_unit_item_after_discount + isc_unitario_final) * actual_igv_rate_for_calculation;
    }

    // 9. Calcular PRC_VTA_UNIT_ITEM (precio de venta unitario final)
    const precio_venta_unitario_final = val_unit_item_after_discount + isc_unitario_final + mnt_igv_item_unitario_final + has_bolsa_tax_unit_amount;

    // 10. Construir el objeto JSON para la API (Redondeado, según la especificación de mifact/SUNAT)
    const itemJSON = {
        COD_ITEM: codigo,
        COD_UNID_ITEM: unidad,
        CANT_UNID_ITEM: cantidad.toFixed(10), // Numérico de 12 dígitos, hasta 10 decimales
        TXT_DESC_ITEM: descripcion,

        PRC_VTA_UNIT_ITEM: precio_venta_unitario_final.toFixed(2), // Precio del item incluido IGV (2 decimales)
        VAL_UNIT_ITEM: val_unit_item_after_discount.toFixed(10), // Valor del item sin IGV (10 decimales)
        VAL_VTA_ITEM: (val_unit_item_after_discount * cantidad).toFixed(2), // Valor total del item sin IGV (2 decimales)
        MNT_BRUTO: mnt_bruto_total.toFixed(2), // Monto bruto del item (2 decimales)
        MNT_PV_ITEM: (precio_venta_unitario_final * cantidad).toFixed(2), // Venta Total del ITEM incluido IGV, descuentos, cargos adicionales (2 decimales)

        COD_TIP_PRC_VTA: cod_tip_prc_vta, // Tipo de precio de venta
        COD_TIP_AFECT_IGV_ITEM: igv_afectacion_input.toString(), // Código de tipo de afectación del IGV (Catálogo 07)
        COD_TRIB_IGV_ITEM: cod_trib_igv_item, // Código de tributo IGV/IVAP (Catálogo 05)
        POR_IGV_ITEM: por_igv_item_output.toFixed(2), // Tasa de IGV del item (2 decimales)
        MNT_IGV_ITEM: (mnt_igv_item_unitario_final * cantidad).toFixed(2), // IGV total del item (2 decimales)
    };

    // 11. Agregar campos opcionales si tienen valor relevante
    if (codigo_sunat) {
        itemJSON.COD_ITEM_SUNAT = codigo_sunat;
    }
    if (monto_dscto_unitario_sin_igv * cantidad > 0) {
        itemJSON.MNT_DSCTO_ITEM = (monto_dscto_unitario_sin_igv * cantidad).toFixed(2); // Monto total del descuento del item sin IGV (2 decimales)
    }
    if (isc_unitario_final > 0) {
        itemJSON.MNT_ISC_ITEM = (isc_unitario_final * cantidad).toFixed(2); // ISC total del item (2 decimales)
        itemJSON.POR_ISC_ITEM = por_isc_item_output.toFixed(2); // Porcentaje de ISC del item (2 decimales)
        itemJSON.COD_TIP_SIST_ISC = cod_tip_sist_isc; // Código de sistema de cálculo del ISC (Catálogo 08)
    }
    if (has_bolsa_tax_unit_amount > 0) {
        itemJSON.IMPUESTO_BOLSAS_UNIT = has_bolsa_tax_unit_amount.toFixed(2); // Impuesto a la bolsa unitario (2 decimales)
    }

    return itemJSON;
}


export {
    sendDoc,
}