import fs from "fs"
import path from "path"
import cSistema from "../../routes/_sistema/cSistema.js"
import { pathXml } from '#shared/uploadFiles.js'
import { Builder } from "xml2js"

// --- Variables generales --- //
export function crearXml(fileName, doc) {
    try {
        // Crear carpeta si no existe
        if (!fs.existsSync(pathXml)) fs.mkdirSync(pathXml, { recursive: true })
        const ruta = path.join(pathXml, fileName)

        // Si ya existe, eliminarlo
        if (fs.existsSync(ruta)) fs.unlinkSync(ruta)

        const xml = desarrolloXml(doc)

        // Guardar XML
        fs.writeFileSync(ruta, xml, { encoding: "utf8" })

        console.log("✅ XML generado:", ruta)
        return ruta
    } catch (err) {
        console.error("❌ Error generando XML:", err.message)
        throw err
    }
}

function desarrolloXml(doc) {
    const {
        pago_condicion, monto,
        empresa_datos, cliente_datos,
        doc_tipo, serie, numero, fecha_emision, hora_emision, fecha_vencimiento,
        moneda,
        orden_compra, guias_adjuntas,
        items,
    } = doc

    const local_anexo = '0000'

    let linea_inicio = ''
    let InvoiceTypeCode = ''
    let tipo_operacion = '0101'
    let tag_total_pago = ''
    let tag_item = ''
    let tag_item_cantidad = ''

    if (['01', '03'].includes(doc_tipo)) {
        linea_inicio = `
        <Invoice xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
            xmlns:xsd="http://www.w3.org/2001/XMLSchema"
            xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
            xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
            xmlns:ccts="urn:un:unece:uncefact:documentation:2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
            xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
            xmlns:qdt="urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2"
            xmlns:udt="urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2"
            xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
        `

        InvoiceTypeCode = `
        <cbc:InvoiceTypeCode listID="${tipo_operacion}" listAgencyName="PE:SUNAT" listName="Tipo de Documento"
            listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01" name="Tipo de Operacion"
            listSchemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo51">${doc_tipo}</cbc:InvoiceTypeCode>
        `

        tag_total_pago = 'LegalMonetaryTotal'
        tag_item = 'InvoiceLine'
        tag_item_cantidad = 'InvoicedQuantity'
    }

    // --- Encabezado --- //
    let xml = '<?xml version="1.0" encoding="ISO-8859-1" standalone="no"?>' + linea_inicio

    // --- Espacio para la firma --- //
    xml += `
    <ext:UBLExtensions>
        <ext:UBLExtension>
            <ext:ExtensionContent></ext:ExtensionContent>
        </ext:UBLExtension>
    </ext:UBLExtensions>
    `

    // --- Datos generales --- //
    xml += `
    <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
    <cbc:CustomizationID>2.0</cbc:CustomizationID>
    <cbc:ID>${serie}-${numero}</cbc:ID>
    <cbc:IssueDate>${fecha_emision}</cbc:IssueDate>
    <cbc:IssueTime>${hora_emision}</cbc:IssueTime>
    `

    if (['01', '03'].includes(doc_tipo)) {
        if (fecha_vencimiento != null && fecha_vencimiento != '') {
            xml += `<cbc:DueDate>${fecha_vencimiento}</cbc:DueDate>`
        }
    }

    // --- Tipo de documento --- //
    xml += InvoiceTypeCode

    // --- Moneda --- //
    xml += `
    <cbc:DocumentCurrencyCode listID="ISO 4217 Alpha" listName="Currency"
        listAgencyName="United Nations Economic Commission for Europe">${moneda}</cbc:DocumentCurrencyCode>
    `

    // --- Orden de compra --- //
    if (['01', '03'].includes(doc_tipo)) {
        if (orden_compra != null && orden_compra != "") {
            xml += `
            <cac:OrderReference>
                <cbc:ID>${orden_compra}</cbc:ID>
            </cac:OrderReference>
            `
        }
    }

    // --- Guías relacionadas --- //
    if (guias_adjuntas != null && guias_adjuntas.length > 0) {
        guias_adjuntas.forEach(guia => {
            xml += `
            <cac:DespatchDocumentReference>
                <cbc:ID>${guia.serie}-${guia.numero}</cbc:ID>
                <cbc:DocumentTypeCode listAgencyName="PE:SUNAT" listName="Tipo de Documento"
                    listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01">${guia.codigo_documento}</cbc:DocumentTypeCode>
            </cac:DespatchDocumentReference>
            `
        })
    }

    // --- Empresa emisora --- //
    xml += `
    <cac:Signature>
        <cbc:ID>${empresa_datos.ruc}</cbc:ID>
        <cac:SignatoryParty>
            <cac:PartyIdentification>
                <cbc:ID>${empresa_datos.ruc}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyName>
                <cbc:Name>${empresa_datos.razon_social}</cbc:Name>
            </cac:PartyName>
        </cac:SignatoryParty>
        <cac:DigitalSignatureAttachment>
            <cac:ExternalReference>
                <cbc:URI>${empresa_datos.ruc}</cbc:URI>
            </cac:ExternalReference>
        </cac:DigitalSignatureAttachment>
    </cac:Signature>
    `

    // --- Proveedor --- //
    xml += `
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="6" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT"
                    schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">${empresa_datos.ruc}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyName>
                <cbc:Name>${empresa_datos.nombre_comercial}</cbc:Name>
            </cac:PartyName>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${empresa_datos.razon_social}</cbc:RegistrationName>
                <cac:RegistrationAddress>
                    <cbc:ID schemeName="Ubigeos" schemeAgencyName="PE:INEI">${empresa_datos.ubigeo}</cbc:ID>
                    <cbc:AddressTypeCode listAgencyName="PE:SUNAT" listName="Establecimientos anexos">${local_anexo}</cbc:AddressTypeCode>
                    <cbc:CityName>${empresa_datos.provincia}</cbc:CityName>
                    <cbc:CountrySubentity>${empresa_datos.departamento}</cbc:CountrySubentity>
                    <cbc:District>${empresa_datos.distrito}</cbc:District>
                    <cac:AddressLine>
                        <cbc:Line>${empresa_datos.domicilio_fiscal}</cbc:Line>
                    </cac:AddressLine>
                    <cac:Country>
                        <cbc:IdentificationCode listID="ISO 3166-1"
                            listAgencyName="United Nations Economic Commission for Europe"
                            listName="Country">PE</cbc:IdentificationCode>
                    </cac:Country>
                </cac:RegistrationAddress>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>
    `

    // Cliente
    xml += `
    <cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="${cliente_datos.doc_tipo}" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT"
                    schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">${cliente_datos.doc_numero}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${cliente_datos.razon_social_nombres}</cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingCustomerParty>
    `

    // --- Forma de pago --- //
    if (['01', '03', '07'].includes(doc_tipo)) {
        if (pago_condicion == 1) {
            xml += `
            <cac:PaymentTerms>
                <cbc:ID>FormaPago</cbc:ID>
                <cbc:PaymentMeansID>Contado</cbc:PaymentMeansID>
            </cac:PaymentTerms>
            `
        }

        if (pago_condicion == 2) {
            xml += `
            <cac:PaymentTerms>
                <cbc:ID>FormaPago</cbc:ID>
                <cbc:PaymentMeansID>Credito</cbc:PaymentMeansID>
                <cbc:Amount currencyID="${moneda}">${monto}</cbc:Amount>
            </cac:PaymentTerms>
            `

            if (cuotas && cuotas.length > 0) {
                let contar_cuota = 1
                for (const cuota of cuotas) {
                    xml += `
                    <cac:PaymentTerms>
                        <cbc:ID>FormaPago</cbc:ID>
                        <cbc:PaymentMeansID>Cuota00${contar_cuota}</cbc:PaymentMeansID>
                        <cbc:Amount currencyID="${moneda}">${cuota.monto}</cbc:Amount>
                        <cbc:PaymentDueDate>${cuota.fecha}</cbc:PaymentDueDate>
                    </cac:PaymentTerms>
                    `
                    contar_cuota++
                }

            }
        }
    }

    const response = generateInvoiceTotals(items, moneda, cSistema.sistemaData.CATALOGO_TRIBUTOS_SUNAT)

    // --- Impuestos --- //
    const builder1 = new Builder({ headless: true, rootName: 'cac:TaxTotal' })
    xml += `
    ${builder1.buildObject(response['cac:TaxTotal'])}
    `

    // --- Totales --- //
    const builder2 = new Builder({ headless: true, rootName: 'cac:LegalMonetaryTotal' })
    xml += `
    ${builder2.buildObject(response['cac:LegalMonetaryTotal'])}
    `

    // --- Items --- //
    const builder3 = new Builder({ headless: true, rootName: 'cac:InvoiceLine' })
    for (const a of response.InvoiceLines) {
        xml += `
        ${builder3.buildObject(a)}
        `
    }

    xml += `</Invoice>`

    return xml
}

function generateInvoiceLine(product, CURRENCY_ID, CATALOGO_TRIBUTOS_SUNAT, bolsa_tax_unit_amount) {
    const tributosCatalog = CATALOGO_TRIBUTOS_SUNAT;

    // --- 1. Aplicar valores por defecto al producto --- //
    product.has_bolsa_tax = product.has_bolsa_tax || false;
    product.isc_porcentaje = product.isc_porcentaje || 0;
    product.isc_precio_sugerido = product.isc_precio_sugerido || 0;
    product.isc_monto_fijo_unitario = product.isc_monto_fijo_unitario || 0;
    product.ivap_porcentaje = product.ivap_porcentaje || 0;
    product.igv_porcentaje = product.igv_porcentaje || 0;

    // --- 2. Identificación de la información del tax principal --- //
    const igv_afectacion_code = product.igv_afectacion;
    let tax_info = tributosCatalog[igv_afectacion_code];

    if (!tax_info) {
        console.warn(`Código de afectación IGV '${igv_afectacion_code}' no encontrado en el catálogo de tributos. Se usará un esquema genérico de INAFECTO.`);
        // Fallback para códigos no definidos en el catálogo
        const defaultInafecto = tributosCatalog["30"] || { "codigo_tributo": "9998", "codigo_internacional": "FRE", "codigo": "INA", "nombre": "Inafecto - Operación Onerosa", "categoria_impuesto_id": "O" };
        tax_info = { ...defaultInafecto, codigo_tributo: "9998", nombre: `Desconocido - ${igv_afectacion_code}` };
    }

    // --- 3. Cálculos unitarios y totales de descuentos e impuestos (lógica unificada) --- //

    // a. Valor unitario neto después de descuentos por ítem, antes de impuestos
    const vu_neto_sin_impuestos = product.vu - product.descuento_vu;

    // b. Valor de venta del ítem (sin IGV/ISC, después de descuentos por ítem)
    // const line_extension_amount = vu_neto_sin_impuestos * product.cantidad;
    const line_extension_amount = tax_info.codigo_tributo == '9996' ? 0 : vu_neto_sin_impuestos * product.cantidad


    // c. Impuesto al Consumo de Bolsas de Plástico (ICBPER) unitario y total
    const icbper_unitario = (product.has_bolsa_tax === true) ? bolsa_tax_unit_amount : 0;
    const bolsa_tax_calculated_amount_total = icbper_unitario * product.cantidad;

    // d. Impuesto Selectivo al Consumo (ISC) unitario y total
    let isc_unitario = 0;
    let isc_taxable_amount_unit = 0; // Base imponible unitaria para ISC
    let isc_tier_range = ''; // Catálogo 08
    let isc_percent_value = '0.000'; // Puede tener más decimales

    if (product.isc_sistema_codigo) {
        switch (product.isc_sistema_codigo) {
            case '01': // Sistema al valor (Apéndice IV, lit. A)
                isc_unitario = vu_neto_sin_impuestos * (product.isc_porcentaje / 100);
                isc_taxable_amount_unit = vu_neto_sin_impuestos; // Base es el valor de venta unitario neto
                isc_tier_range = '01';
                isc_percent_value = product.isc_porcentaje.toFixed(3);
                break;
            case '02': // Aplicación del Monto Fijo (Apéndice IV, lit. B)
                isc_unitario = product.isc_monto_fijo_unitario;
                isc_taxable_amount_unit = product.isc_monto_fijo_unitario; // En este caso, la base es el monto fijo unitario
                isc_tier_range = '02';
                isc_percent_value = '0.000'; // Es un monto fijo, no un porcentaje de base
                break;
            case '03': // Sistema de Precios de Venta al Público (Apéndice IV, lit. C)
                isc_unitario = product.isc_precio_sugerido * (product.isc_porcentaje / 100);
                isc_taxable_amount_unit = product.isc_precio_sugerido;
                isc_tier_range = '03';
                isc_percent_value = product.isc_porcentaje.toFixed(3);
                break;
        }
    }
    const isc_calculated_amount_total = isc_unitario * product.cantidad; // ISC total para la línea
    const isc_taxable_amount_total_line = isc_taxable_amount_unit * product.cantidad; // Base imponible total para ISC

    // e. Impuesto a la Venta de Arroz Pilado (IVAP) unitario y total
    let ivap_unitario = 0;
    if (igv_afectacion_code === '17') { // "Gravado - IVAP"
        ivap_unitario = vu_neto_sin_impuestos * (product.ivap_porcentaje / 100);
    }
    const ivap_calculated_amount_total = ivap_unitario * product.cantidad; // IVAP total para la línea

    // f. Base imponible unitaria para el cálculo del IGV (CORRECCIÓN IMPORTANTE)
    // El IGV se calcula sobre el valor unitario neto después de descuentos + ISC (si aplica).
    const base_para_igv_unit = vu_neto_sin_impuestos + isc_unitario;
    const base_para_igv_total_line = base_para_igv_unit * product.cantidad; // Base imponible total para IGV en la línea

    // g. Impuesto General a las Ventas (IGV) unitario y total
    let igv_unitario = 0;
    // Códigos 10 al 16 en el Catálogo No. 07 corresponden a operaciones gravadas con IGV
    if (['10', '11', '12', '13', '14', '15', '16'].includes(igv_afectacion_code)) {
        igv_unitario = base_para_igv_unit * (product.igv_porcentaje / 100);
    }

    const igv_calculated_amount_total = igv_unitario * product.cantidad; // IGV total para la línea

    // h. Precio de Venta Unitario final (Punto 38 - alternative_contition_price_amount)
    // Es la suma de todos los componentes: Valor Unitario Neto + ISC + IVAP + IGV + ICBPER.
    const alternative_contition_price_amount = vu_neto_sin_impuestos + isc_unitario + ivap_unitario + igv_unitario + icbper_unitario;


    // --- 4. Preparación de datos para la estructura cac:InvoiceLine --- //

    // a. Código de tipo de precio
    let codigo_tipo_precio = '';
    if (tax_info.codigo_tributo == '9996') { // Gratuito
        codigo_tipo_precio = '02'; // Valor referencial unitario en operaciones no onerosas
    } else {
        codigo_tipo_precio = '01'; // Precio unitario (incluye el IGV)
    }

    // b. Descuentos por ítem (ya calculados, re-declaramos para uso en JSON)
    const discount_amount = product.descuento_vu * product.cantidad;
    const discount_base_amount = product.vu * product.cantidad;
    const discount_multiplier_factor_numeric = (discount_base_amount > 0) ? discount_amount / discount_base_amount : 0;

    let total_tax_amount_item = 0;
    const tax_subtotals_array = []; // Array para almacenar múltiples cac:TaxSubtotal

    // c. Subtotal de IGV/IVAP
    let current_igv_taxable_amount_for_subtotal = base_para_igv_total_line; // Base imponible corregida
    let current_igv_calculated_amount_for_subtotal = igv_calculated_amount_total; // Monto de IGV calculado previamente
    let current_igv_percent_value = product.igv_porcentaje; // Porcentaje de IGV previamente establecido

    // Ajuste para IVAP si aplica
    if (tax_info.codigo_tributo === "1016") { // IVAP
        current_igv_taxable_amount_for_subtotal = line_extension_amount; // IVAP se calcula sobre vu_neto_sin_impuestos * cantidad
        current_igv_calculated_amount_for_subtotal = ivap_calculated_amount_total;
        current_igv_percent_value = product.ivap_porcentaje;
    } else if (["9997", "9998", "9995", "9996"].includes(tax_info.codigo_tributo)) { // Exonerado, Inafecto, Exportación, Gratuito
        if (!['11', '12', '13', '14', '15', '16'].includes(igv_afectacion_code)) {
            current_igv_calculated_amount_for_subtotal = 0;
            current_igv_percent_value = 0;
            // La base imponible puede seguir siendo line_extension_amount para propósitos informativos, o 0 si no hay base para IGV.
        }
    }

    // Solo añadir TaxSubtotal si hay un monto calculado de IGV/IVAP o una base imponible positiva.
    if (current_igv_calculated_amount_for_subtotal > 0 || current_igv_taxable_amount_for_subtotal > 0) {
        tax_subtotals_array.push({
            "cbc:TaxableAmount": {
                "$": { "currencyID": CURRENCY_ID },
                "_": current_igv_taxable_amount_for_subtotal.toFixed(2)
            },
            "cbc:TaxAmount": {
                "$": { "currencyID": CURRENCY_ID },
                "_": current_igv_calculated_amount_for_subtotal.toFixed(2)
            },
            "cac:TaxCategory": {
                "cbc:ID": {
                    "$": {
                        "schemeID": "UN/ECE 5305",
                        "schemeName": "Tax Category Identifier",
                        "schemeAgencyName": "United Nations Economic Commission for Europe"
                    },
                    "_": tax_info.categoria_impuesto_id // 'S', 'E', 'O', 'Z' según el catálogo
                },
                "cbc:Percent": current_igv_percent_value,
                "cbc:TaxExemptionReasonCode": {
                    "$": {
                        "listAgencyName": "PE:SUNAT",
                        "listName": "Afectacion del IGV",
                        "listURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07"
                    },
                    "_": igv_afectacion_code
                },
                "cac:TaxScheme": {
                    "cbc:ID": {
                        "$": {
                            "schemeID": "UN/ECE 5153",
                            "schemeAgencyID": "6"
                        },
                        "_": tax_info.codigo_tributo
                    },
                    "cbc:Name": tax_info.codigo, // e.g., "IGV", "GRA", "EXO", "INA", "EXP"
                    "cbc:TaxTypeCode": tax_info.codigo_internacional // e.g., "VAT", "FRE"
                }
            }
        });

        if (!['11', '12', '13', '14', '15', '16'].includes(igv_afectacion_code)) {
            total_tax_amount_item += current_igv_calculated_amount_for_subtotal
        }
    }

    // d. Subtotal de ISC
    if (isc_calculated_amount_total > 0) {
        const isc_tax_info = tributosCatalog["ISC"]; // Asumiendo que 'ISC' es una entrada directa en el catálogo
        tax_subtotals_array.push({
            "cbc:TaxableAmount": {
                "$": { "currencyID": CURRENCY_ID },
                "_": isc_taxable_amount_total_line.toFixed(2)
            },
            "cbc:TaxAmount": {
                "$": { "currencyID": CURRENCY_ID },
                "_": isc_calculated_amount_total.toFixed(2)
            },
            "cac:TaxCategory": {
                "cbc:ID": {
                    "$": { "schemeID": "UN/ECE 5305", "schemeName": "Tax Category Identifier", "schemeAgencyName": "United Nations Economic Commission for Europe" },
                    "_": isc_tax_info.categoria_impuesto_id // 'S' para ISC gravado
                },
                "cbc:Percent": isc_percent_value,
                "cbc:TaxExemptionReasonCode": {
                    // El TaxExemptionReasonCode es siempre el código de afectación del IGV para ISC
                    "$": { "listAgencyName": "PE:SUNAT", "listName": "SUNAT:Codigo de Tipo de Afectación del IGV", "listURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07" },
                    "_": igv_afectacion_code
                },
                "cbc:TierRange": isc_tier_range,
                "cac:TaxScheme": {
                    "cbc:ID": { "$": { "schemeID": "UN/ECE 5153", "schemeAgencyID": "6" }, "_": isc_tax_info.codigo_tributo },
                    "cbc:Name": isc_tax_info.codigo,
                    "cbc:TaxTypeCode": isc_tax_info.codigo_internacional
                }
            }
        });
        total_tax_amount_item += isc_calculated_amount_total;
    }

    // e. Subtotal de Impuesto a la Bolsa Plástica (Bolsa Tax)
    if (bolsa_tax_calculated_amount_total > 0) {
        const bolsa_tax_info = tributosCatalog["ICBPER"]; // Asumiendo que 'ICBPER' es una entrada directa en el catálogo
        tax_subtotals_array.push({
            "cbc:TaxableAmount": { // Para impuestos fijos, puede ser 0 o la base calculada.
                "$": { "currencyID": CURRENCY_ID },
                "_": 0
            },
            "cbc:TaxAmount": {
                "$": { "currencyID": CURRENCY_ID },
                "_": bolsa_tax_calculated_amount_total.toFixed(2)
            },
            "cbc:BaseUnitMeasure": {
                "$": { "unitCode": "NIU" },
                "_": product.cantidad, // número de bolsas
            },
            "cac:TaxCategory": {
                "cbc:ID": {
                    "$": {
                        "schemeID": "UN/ECE 5305",
                        "schemeName": "Tax Category Identifier",
                        "schemeAgencyName": "United Nations Economic Commission for Europe"
                    },
                    "_": bolsa_tax_info.categoria_impuesto_id // 'O' para otros tributos no afectos al IGV usualmente
                },
                "cbc:PerUnitAmount": {
                    "$": { "currencyID": CURRENCY_ID },
                    "_": bolsa_tax_unit_amount.toFixed(2)
                },
                "cac:TaxScheme": {
                    "cbc:ID": {
                        "$": {
                            "schemeID": "UN/ECE 5153",
                            "schemeAgencyID": "6"
                        },
                        "_": bolsa_tax_info.codigo_tributo
                    },
                    "cbc:Name": bolsa_tax_info.codigo,
                    "cbc:TaxTypeCode": bolsa_tax_info.codigo_internacional
                }
            }
        });
        total_tax_amount_item += bolsa_tax_calculated_amount_total;
    }

    // f. Monto para cbc:PriceAmount en cac:Price
    const price_priceAmount = tax_info.codigo_tributo == '9996' ? 0 : product.vu;

    // --- 5. Retorna la estructura final del cac:InvoiceLine ---
    const send = { "cbc:ID": product.i }
    send["cbc:InvoicedQuantity"] = {
        "$": {
            "unitCode": product.unidad,
            "unitCodeListID": "UN/ECE rec 20",
            "unitCodeListAgencyName": "United Nations Economic Commission for Europe"
        },
        "_": product.cantidad.toFixed(2)
    }

    send["cbc:LineExtensionAmount"] = {
        "$": { "currencyID": CURRENCY_ID },
        "_": line_extension_amount.toFixed(2)
    }

    send["cac:PricingReference"] = {
        "cac:AlternativeConditionPrice": {
            "cbc:PriceAmount": {
                "$": { "currencyID": CURRENCY_ID },
                "_": alternative_contition_price_amount.toFixed(10)
            },
            "cbc:PriceTypeCode": {
                "$": {
                    "listAgencyName": "PE:SUNAT",
                    "listName": "Tipo de Precio",
                    "listURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo16"
                },
                "_": codigo_tipo_precio
            },
        }
    }

    if (discount_multiplier_factor_numeric > 0) {
        send["cac:AllowanceCharge"] = {
            "cbc:ChargeIndicator": false, // `false` indica descuento
            "cbc:AllowanceChargeReasonCode": {
                "$": {
                    "listAgencyName": "PE:SUNAT",
                    "listName": "Cargo/descuento",
                    "listURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo53"
                },
                "_": "00" // Código "00" para "OTROS DESCUENTOS"
            },
            "cbc:MultiplierFactorNumeric": discount_multiplier_factor_numeric.toFixed(5),
            "cbc:Amount": { "$": { "currencyID": CURRENCY_ID }, "_": discount_amount.toFixed(2) },
            "cbc:BaseAmount": { "$": { "currencyID": CURRENCY_ID }, "_": discount_base_amount.toFixed(2) }
        }
    }

    send["cac:TaxTotal"] = {
        "cbc:TaxAmount": {
            "$": { "currencyID": CURRENCY_ID },
            "_": total_tax_amount_item.toFixed(2)
        },
        "cac:TaxSubtotal": tax_subtotals_array
    }

    send["cac:Item"] = {
        "cbc:Description": product.descripcion,
        "cac:SellersItemIdentification": {
            "cbc:ID": product.codigo
        },
        // "cac:CommodityClassification": {
        //     "cbc:ItemClassificationCode": product.codigo_sunat
        // }
    }

    send["cac:Price"] = {
        "cbc:PriceAmount": {
            "$": { "currencyID": CURRENCY_ID },
            "_": price_priceAmount.toFixed(10)
        }
    }

    return send
}

function generateInvoiceTotals(items, CURRENCY_ID, CATALOGO_TRIBUTOS_SUNAT, globalAllowanceAmount = 0, globalChargeAmount = 0, prepaidAmount = 0) {
    let totalLineExtensionAmount = 0;    // Suma de cbc:LineExtensionAmount de todas las InvoiceLines
    let totalTaxAmountInvoice = 0;       // Suma de cbc:TaxAmount de todos los cac:TaxTotal a nivel de ítem
    let totalAllowanceAmount = globalAllowanceAmount; // Descuentos globales + suma de descuentos por ítem
    let totalChargeAmount = globalChargeAmount;     // Cargos globales (asumiendo que generateInvoiceLine no produce cargos por ítem en este contexto)

    const InvoiceLines = []
    // Mapa para agregar los TaxSubtotals por ID de esquema tributario (codigo_tributo)
    const aggregatedTaxSubtotals = {};

    let i = 1
    for (const item of items) {
        const line = generateInvoiceLine(item, CURRENCY_ID, CATALOGO_TRIBUTOS_SUNAT, cSistema.sistemaData.bolsa_tax_unit_amount)
        InvoiceLines.push(line)
        i = i + 1

        // 1. Acumular el valor de venta de la línea (sin impuestos, descuentos ni cargos por línea)
        totalLineExtensionAmount += parseFloat(line["cbc:LineExtensionAmount"]["_"])

        // 2. Acumular el monto total de impuestos por ítem para el total de la factura
        // const codigo_tributo = line["cac:TaxTotal"]["cac:TaxSubtotal"]["cac:TaxCategory"]["cac:TaxScheme"]["cbc:ID"]
        // if (codigo_tributo == '1000') {
        totalTaxAmountInvoice += parseFloat(line["cac:TaxTotal"]["cbc:TaxAmount"]["_"])
        // }

        // 3. Acumular los descuentos a nivel de ítem (generateInvoiceLine genera ChargeIndicator: false para descuentos)
        if (line["cac:AllowanceCharge"]) {
            totalAllowanceAmount += parseFloat(line["cac:AllowanceCharge"]["cbc:Amount"]["_"]);
        }

        // 4. Agregar los TaxSubtotals para el cac:TaxTotal a nivel de factura
        for (const itemTaxSubtotal of line["cac:TaxTotal"]["cac:TaxSubtotal"]) {
            const taxSchemeID = itemTaxSubtotal["cac:TaxCategory"]["cac:TaxScheme"]["cbc:ID"]["_"];
            const taxableAmount = parseFloat(itemTaxSubtotal["cbc:TaxableAmount"]["_"]);
            const taxAmount = parseFloat(itemTaxSubtotal["cbc:TaxAmount"]["_"]);

            if (!aggregatedTaxSubtotals[taxSchemeID]) {
                // Inicializar con los atributos y valores del primer subtotal de ítem encontrado para este esquema de impuestos.
                // Esto asegura que se capturen correctamente las propiedades como schemeID, schemeName, etc.
                aggregatedTaxSubtotals[taxSchemeID] = {
                    "cbc:TaxableAmount": 0,
                    "cbc:TaxAmount": 0,
                    "cac:TaxCategory": {
                        "cbc:ID": {
                            "$": itemTaxSubtotal["cac:TaxCategory"]["cbc:ID"]["$"],
                            "_": itemTaxSubtotal["cac:TaxCategory"]["cbc:ID"]["_"]
                        },
                        "cac:TaxScheme": {
                            "cbc:ID": {
                                "$": itemTaxSubtotal["cac:TaxCategory"]["cac:TaxScheme"]["cbc:ID"]["$"],
                                "_": itemTaxSubtotal["cac:TaxCategory"]["cac:TaxScheme"]["cbc:ID"]["_"]
                            },
                            "cbc:Name": itemTaxSubtotal["cac:TaxCategory"]["cac:TaxScheme"]["cbc:Name"],
                            "cbc:TaxTypeCode": itemTaxSubtotal["cac:TaxCategory"]["cac:TaxScheme"]["cbc:TaxTypeCode"]
                        }
                    }
                };
                // Añadir TierRange solo si está presente en el subtotal de ítem para ISC
                if (itemTaxSubtotal["cac:TaxCategory"]["cbc:TierRange"] !== undefined) {
                    aggregatedTaxSubtotals[taxSchemeID]["cac:TaxCategory"]["cbc:TierRange"] = itemTaxSubtotal["cac:TaxCategory"]["cbc:TierRange"];
                }
            }

            // Acumular los montos
            aggregatedTaxSubtotals[taxSchemeID]["cbc:TaxableAmount"] += taxableAmount;
            aggregatedTaxSubtotals[taxSchemeID]["cbc:TaxAmount"] += taxAmount;
        }
    }

    // Convertir el mapa de TaxSubtotals agregados a un arreglo y formatear los valores
    const taxSubtotalsArray = Object.values(aggregatedTaxSubtotals).map(subtotal => {
        const taxCategory = {
            "cbc:ID": subtotal["cac:TaxCategory"]["cbc:ID"],
            "cac:TaxScheme": subtotal["cac:TaxCategory"]["cac:TaxScheme"]
        };

        // Añadir cbc:TierRange específicamente para ISC si fue recolectado
        if (subtotal["cac:TaxCategory"]["cbc:TierRange"] !== undefined) {
            taxCategory["cbc:TierRange"] = subtotal["cac:TaxCategory"]["cbc:TierRange"];
        }

        return {
            "cbc:TaxableAmount": {
                "$": { "currencyID": CURRENCY_ID },
                "_": subtotal["cbc:TaxableAmount"].toFixed(2)
            },
            "cbc:TaxAmount": {
                "$": { "currencyID": CURRENCY_ID },
                "_": subtotal["cbc:TaxAmount"].toFixed(2)
            },
            "cac:TaxCategory": taxCategory
        };
    });

    // 5. Calcular los valores para cac:LegalMonetaryTotal
    // Total precio de venta (incluye impuestos) [71-74].
    // Según el ejemplo de la Boleta, es la suma del valor de extensión de línea y el monto total de impuestos.
    const taxInclusiveAmount = totalLineExtensionAmount + totalTaxAmountInvoice;

    // Importe total de la venta, cesión en uso o del servicio prestado [75-78].
    // Es el monto final a pagar, que ajusta el precio inclusivo de impuestos con descuentos, cargos y anticipos.
    // const payableAmount = taxInclusiveAmount - totalAllowanceAmount + totalChargeAmount - prepaidAmount;
    const payableAmount = taxInclusiveAmount - globalAllowanceAmount + totalChargeAmount - prepaidAmount;

    const legalMonetaryTotal = {
        "cbc:LineExtensionAmount": {
            "$": { "currencyID": CURRENCY_ID },
            "_": totalLineExtensionAmount.toFixed(2)
        },
        "cbc:TaxInclusiveAmount": {
            "$": { "currencyID": CURRENCY_ID },
            "_": taxInclusiveAmount.toFixed(2)
        },
        "cbc:AllowanceTotalAmount": {
            "$": { "currencyID": CURRENCY_ID },
            "_": globalAllowanceAmount.toFixed(2)
            // "_": totalAllowanceAmount.toFixed(2)
        },
        "cbc:ChargeTotalAmount": {
            "$": { "currencyID": CURRENCY_ID },
            "_": totalChargeAmount.toFixed(2)
        },
        "cbc:PrepaidAmount": {
            "$": { "currencyID": CURRENCY_ID },
            "_": prepaidAmount.toFixed(2)
        },
        "cbc:PayableAmount": {
            "$": { "currencyID": CURRENCY_ID },
            "_": payableAmount.toFixed(2)
        }
    };

    const taxTotal = {
        "cbc:TaxAmount": {
            "$": { "currencyID": CURRENCY_ID },
            "_": totalTaxAmountInvoice.toFixed(2)
        },
        "cac:TaxSubtotal": taxSubtotalsArray
    };

    return {
        "cac:TaxTotal": taxTotal,
        "cac:LegalMonetaryTotal": legalMonetaryTotal,
        InvoiceLines
    };
}