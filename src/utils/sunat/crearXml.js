import fs from "fs"
import path from "path"
import { fileURLToPath } from 'url'
import { numeroATexto } from "../mine.js"
import cSistema from "../../routes/_sistema/cSistema.js"

// --- Variables generales --- //
const icbper = 0.5

export function crearXml(fileName, doc) {
    try {
        const __filename = fileURLToPath(import.meta.url)
        const __dirname = path.dirname(__filename)
        const carpeta = path.join(__dirname, '..', '..', '..', 'sunat', 'xml')

        // Crear carpeta si no existe
        if (!fs.existsSync(carpeta)) {
            fs.mkdirSync(carpeta, { recursive: true })
        }

        const ruta = path.join(carpeta, fileName)

        // Si ya existe, eliminarlo
        if (fs.existsSync(ruta)) {
            fs.unlinkSync(ruta)
        }

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
        pago_condicion,
        empresa, cliente,
        doc_tipo, serie, numero, fecha_emision, hora_emision, fecha_vencimiento,
        moneda, total_gravada, total_exonerada, total_inafecta,
        total_gratuito, total_gratuito_igv, total_igv, total_bolsa,
        total_descuento,
        orden_compra, guias_adjuntas,
        items,
    } = doc

    const local_anexo = '0000'
    const total_a_pagar = total_gravada + total_exonerada + total_inafecta + total_igv + total_bolsa

    let linea_inicio = ''
    let InvoiceTypeCode = ''
    let tag_total_pago = ''
    let tipo_operacion = '0101'
    let tag_item = ''
    let tag_item_cantidad = ''

    if (['01', '03'].includes(doc_tipo)) {
        linea_inicio = `
        <Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
            xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
            xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
            xmlns:ccts="urn:un:unece:uncefact:documentation:2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
            xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
            xmlns:qdt="urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2"
            xmlns:udt="urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2"
            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
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

    // <cbc:Note languageLocaleID="1000">${numeroATexto(total_a_pagar)}</cbc:Note>
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
            </cac:OrderReference>';
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
        <cbc:ID>${empresa.ruc}</cbc:ID>
        <cac:SignatoryParty>
            <cac:PartyIdentification>
                <cbc:ID>${empresa.ruc}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyName>
                <cbc:Name>${empresa.razon_social}</cbc:Name>
            </cac:PartyName>
        </cac:SignatoryParty>
        <cac:DigitalSignatureAttachment>
            <cac:ExternalReference>
                <cbc:URI>${empresa.ruc}</cbc:URI>
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
                    schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">${empresa.ruc}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyName>
                <cbc:Name>${empresa.nombre_comercial}</cbc:Name>
            </cac:PartyName>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${empresa.razon_social}</cbc:RegistrationName>
                <cac:RegistrationAddress>
                    <cbc:ID schemeName="Ubigeos" schemeAgencyName="PE:INEI">${empresa.ubigeo}</cbc:ID>
                    <cbc:AddressTypeCode listAgencyName="PE:SUNAT" listName="Establecimientos anexos">${local_anexo}</cbc:AddressTypeCode>
                    <cbc:CityName>${empresa.provincia}</cbc:CityName>
                    <cbc:CountrySubentity>${empresa.departamento}</cbc:CountrySubentity>
                    <cbc:District>${empresa.distrito}</cbc:District>
                    <cac:AddressLine>
                        <cbc:Line>${empresa.domicilio_fiscal}</cbc:Line>
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
                <cbc:ID schemeID="${cliente.doc_tipo}" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT"
                    schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">${cliente.doc_numero}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${cliente.razon_social_nombres}</cbc:RegistrationName>
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
                <cbc:Amount currencyID="${moneda}">${total_a_pagar}</cbc:Amount>
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

    // --- Impuestos totales --- //
    const docTaxTotal = (total_igv + total_bolsa).toFixed(2)
    xml += `
    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${moneda}">${docTaxTotal}</cbc:TaxAmount>
    `

    if (total_gravada != null && total_gravada > 0) {
        xml += `
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="${moneda}">${total_gravada.toFixed(2)}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="${moneda}">${total_igv.toFixed(2)}</cbc:TaxAmount>
            <cac:TaxCategory>
                <cac:TaxScheme>
                    <cbc:ID schemeName="Codigo de tributos" schemeAgencyName="PE:SUNAT"
                        schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo05">1000</cbc:ID>
                    <cbc:Name>IGV</cbc:Name>
                    <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
        `
    }

    if (total_exonerada != null && total_exonerada > 0) {
        xml += `
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="${moneda}">${total_exonerada.toFixed(2)}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="${moneda}">0.00</cbc:TaxAmount>
            <cac:TaxCategory>
                <cac:TaxScheme>
                    <cbc:ID schemeName="Codigo de tributos" schemeAgencyName="PE:SUNAT"
                        schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo05">9997</cbc:ID>
                    <cbc:Name>EXO</cbc:Name>
                    <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
        `
    }

    if (total_inafecta != null && total_inafecta > 0) {
        xml += `
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="${moneda}">${total_inafecta.toFixed(2)}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="${moneda}">0.00</cbc:TaxAmount>
            <cac:TaxCategory>
                <cac:TaxScheme>
                    <cbc:ID schemeName="Codigo de tributos" schemeAgencyName="PE:SUNAT"
                        schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo05">9998</cbc:ID>
                    <cbc:Name>INA</cbc:Name>
                    <cbc:TaxTypeCode>FRE</cbc:TaxTypeCode>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
        `
    }

    if (total_gratuito != null && total_gratuito > 0) {
        xml += `
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="${moneda}">${total_gratuito.toFixed(2)}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="${moneda}">${total_gratuito_igv.toFixed(2)}</cbc:TaxAmount>
            <cac:TaxCategory>
                <cac:TaxScheme>
                    <cbc:ID schemeName="Codigo de tributos" schemeAgencyName="PE:SUNAT"
                        schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo05">9996</cbc:ID>
                    <cbc:Name>GRA</cbc:Name>
                    <cbc:TaxTypeCode>FRE</cbc:TaxTypeCode>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>`
    }

    if (total_bolsa != null && total_bolsa > 0) {
        xml += `
        <cac:TaxSubtotal>
            <cbc:TaxAmount currencyID="${moneda}">${total_bolsa.toFixed(2)}</cbc:TaxAmount>
            <cac:TaxCategory>
                <cac:TaxScheme>
                    <cbc:ID schemeAgencyName="PE:SUNAT" schemeName="Codigo de tributos"
                        schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo05">7152</cbc:ID>
                    <cbc:Name>ICBPER</cbc:Name>
                    <cbc:TaxTypeCode>OTH</cbc:TaxTypeCode>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
        `
    }

    xml += `</cac:TaxTotal>`

    // --- Total resumen --- //
    const docLineExtensionAmount = total_gravada + total_exonerada + total_inafecta
    const docTaxInclusiveAmount = total_gravada + total_exonerada + total_inafecta + total_igv + total_bolsa
    const docPayableAmount = total_gravada + total_exonerada + total_inafecta + total_igv + total_bolsa
    xml += `
    <cac:${tag_total_pago}>
        <cbc:LineExtensionAmount currencyID="${moneda}">${docLineExtensionAmount.toFixed(2)}</cbc:LineExtensionAmount>
        <cbc:TaxInclusiveAmount currencyID="${moneda}">${docTaxInclusiveAmount.toFixed(2)}</cbc:TaxInclusiveAmount>
        <cbc:AllowanceTotalAmount currencyID="${moneda}">${total_descuento.toFixed(2)}</cbc:AllowanceTotalAmount>
        <cbc:ChargeTotalAmount currencyID="${moneda}">0.00</cbc:ChargeTotalAmount>
        <cbc:PrepaidAmount currencyID="${moneda}">0.00</cbc:PrepaidAmount>
        <cbc:PayableAmount currencyID="${moneda}">${docPayableAmount.toFixed(2)}</cbc:PayableAmount>
    </cac:${tag_total_pago}>
    `

    // --- Items --- //
    let i = 1

    for (const a of items) {
        const tributo = cSistema.sistemaData.tributos[a.igv_afectacion]

        // --- Inicio del bloque de item --- //
        const itemLineExtensionAmount = calcularValorVentaItem(a)
        const itemPriceAmount = calcularPrecioVentaUnitarioItem(a)
        const itemPriceTypeCode = determinarPriceTypeCode(tributo.codigo_tributo)
        xml += `
        <cac:${tag_item}>
            <cbc:ID>${i}</cbc:ID>
            <cbc:${tag_item_cantidad} unitCode="${a.unidad}" unitCodeListID="UN/ECE rec 20"
                unitCodeListAgencyName="United Nations Economic Commission for Europe">${a.cantidad}</cbc:${tag_item_cantidad}>
            <cbc:LineExtensionAmount currencyID="${moneda}">${itemLineExtensionAmount.toFixed(2)}</cbc:LineExtensionAmount>
            <cac:PricingReference>
                <cac:AlternativeConditionPrice>
                    <cbc:PriceAmount currencyID="${moneda}">${itemPriceAmount.toFixed(10)}</cbc:PriceAmount>
                    <cbc:PriceTypeCode listName="Tipo de Precio" listAgencyName="PE:SUNAT"
                        listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo16">${itemPriceTypeCode}</cbc:PriceTypeCode>
                </cac:AlternativeConditionPrice>
            </cac:PricingReference>
        `

        // --- Descuento por item --- //
        if (a.descuento_vu > 0) {
            const descAmount = a.descuento_vu * a.cantidad
            const descBaseAmount = a.vu * a.cantidad
            const multiplier = descAmount / descBaseAmount

            xml += `
            <cac:AllowanceCharge>
                <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
                <cbc:AllowanceChargeReasonCode listAgencyName="PE:SUNAT" listName="Cargo/descuento"
                    listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo53">00</cbc:AllowanceChargeReasonCode>
                <cbc:MultiplierFactorNumeric>${multiplier.toFixed(5)}</cbc:MultiplierFactorNumeric>
                <cbc:Amount currencyID="${moneda}">${descAmount.toFixed(2)}</cbc:Amount>
                <cbc:BaseAmount currencyID="${moneda}">${descBaseAmount.toFixed(2)}</cbc:BaseAmount>
            </cac:AllowanceCharge>
            `
        }

        // --- TaxTotal + TaxSubtotal --- //
        const itemIcbPer = a.has_bolsa_tax == true ? a.cantidad * icbper : 0
        const itemTaxAmount = setTaxAmount(a, tributo.codigo_tributo) + itemIcbPer
        const itemTaxableAmount = (a.vu - a.descuento_vu) * a.cantidad
        const tax_by_product = setTaxByProduct(a, tributo.codigo_tributo, total_gratuito_igv)
        xml += `
            <cac:TaxTotal>
                <cbc:TaxAmount currencyID="${moneda}">${itemTaxAmount.toFixed(2)}</cbc:TaxAmount>
                <cac:TaxSubtotal>
                    <cbc:TaxableAmount currencyID="${moneda}">${itemTaxableAmount.toFixed(2)}</cbc:TaxableAmount>
                    <cbc:TaxAmount currencyID="${moneda}">${tax_by_product.toFixed(2)}</cbc:TaxAmount>
                    <cac:TaxCategory>
                        <cbc:Percent>${a.igv_porcentaje}</cbc:Percent>
                        <cbc:TaxExemptionReasonCode listAgencyName="PE:SUNAT"
                            listName="Afectacion del IGV"
                            listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07">${a.igv_afectacion}</cbc:TaxExemptionReasonCode>
                        <cac:TaxScheme>
                            <cbc:ID>${tributo.codigo_tributo}</cbc:ID>
                            <cbc:Name>${tributo.codigo}</cbc:Name>
                            <cbc:TaxTypeCode>${tributo.codigo_internacional}</cbc:TaxTypeCode>
                        </cac:TaxScheme>
                    </cac:TaxCategory>
                </cac:TaxSubtotal>
        `

        // --- ICBPER por bolsa --- //
        if (a.has_bolsa_tax == true) {
            xml += `
                <cac:TaxSubtotal>
                    <cbc:TaxAmount currencyID="${moneda}">${itemIcbPer.toFixed(2)}</cbc:TaxAmount>
                    <cbc:BaseUnitMeasure unitCode="NIU">${a.cantidad}</cbc:BaseUnitMeasure>
                    <cac:TaxCategory>
                        <cbc:PerUnitAmount currencyID="${moneda}">${icbper}</cbc:PerUnitAmount>
                        <cac:TaxScheme>
                            <cbc:ID schemeAgencyName="PE:SUNAT" schemeName="Codigo de tributos"
                                schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo05">7152</cbc:ID>
                            <cbc:Name>ICBPER</cbc:Name>
                            <cbc:TaxTypeCode>OTH</cbc:TaxTypeCode>
                        </cac:TaxScheme>
                    </cac:TaxCategory>
                </cac:TaxSubtotal>
            `
        }

        xml += `</cac:TaxTotal>`

        // --- Item y Price --- //
        const price_priceAmount = tributo.codigo_tributo == '9996' ? 0 : a.vu
        xml += `
            <cac:Item>
                <cbc:Description>${a.descripcion}</cbc:Description>
                <cac:SellersItemIdentification>
                    <cbc:ID>${a.codigo_producto}</cbc:ID>
                </cac:SellersItemIdentification>
                <cac:CommodityClassification>
                    <cbc:ItemClassificationCode>${a.codigo_sunat}</cbc:ItemClassificationCode>
                </cac:CommodityClassification>
            </cac:Item>
            <cac:Price>
                <cbc:PriceAmount currencyID="${moneda}">${price_priceAmount.toFixed(10)}</cbc:PriceAmount>
            </cac:Price>
        </cac:${tag_item}>
        `

        i++;
    }

    xml += `</Invoice>`
    return xml
}

// --- Valor de venta por item --- //
/* Este valor representa el importe total de la línea de ítem después de aplicar descuentos unitarios, pero ANTES de cualquier impuesto (IGV, ISC, otros) o cargos */
function calcularValorVentaItem(a) {
    const vu_neto_sin_impuestos = a.vu - a.descuento_vu
    return a.cantidad * vu_neto_sin_impuestos
}

// --- Precio de venta unitario --- //
/* Suma total que queda obligado a pagar el adquirente o usuario por cada bien o servicio. Esto incluye los tributos (IGV, ISC y otros Tributos) y la deducción de descuentos por ítem. */
function calcularPrecioVentaUnitarioItem(item) {
    item.has_bolsa_tax = item.has_bolsa_tax || false;
    item.isc_porcentaje = item.isc_porcentaje || 0;
    item.isc_precio_sugerido = item.isc_precio_sugerido || 0;
    item.isc_monto_fijo_unitario = item.isc_monto_fijo_unitario || 0;
    item.ivap_porcentaje = item.ivap_porcentaje || 0;

    // 1. Calcular el valor unitario después de aplicar el descuento por ítem, antes de cualquier impuesto.
    // Este valor corresponde a 'Q x Valor Unitario' menos 'Descuentos aplicados a dicho ítem' [10].
    const vu_neto_sin_impuestos = item.vu - item.descuento_vu;

    // 2. Calcular el monto unitario del Impuesto al Consumo de Bolsas de Plástico (ICBPER).
    // El ICBPER se suma al precio final, independientemente del tipo de afectación de IGV [2, 11].
    const icbper_unitario = (item.has_bolsa_tax === true) ? icbper : 0;

    // 3. Calcular el monto unitario del Impuesto Selectivo al Consumo (ISC).
    let isc_unitario = 0;
    if (item.isc_sistema_codigo) { // Se verifica si hay un sistema ISC definido (Catálogo No. 08) [6, 7].
        switch (item.isc_sistema_codigo) {
            case '01': // Sistema al valor (Apéndice IV, lit. A)
                // Se aplica como porcentaje sobre el valor de venta unitario neto (sin otros impuestos).
                isc_unitario = vu_neto_sin_impuestos * (item.isc_porcentaje / 100);
                break;
            case '02': // Aplicación del Monto Fijo (Apéndice IV, lit. B)
                // Es un monto fijo por unidad.
                isc_unitario = item.isc_monto_fijo_unitario;
                break;
            case '03': // Sistema de Precios de Venta al Público (Apéndice IV, lit. C)
                // Se calcula como un porcentaje sobre un precio de venta al público sugerido [8, 9].
                isc_unitario = item.isc_precio_sugerido * (item.isc_porcentaje / 100);
                break;
            // Para otros códigos de sistema ISC o si no se proporciona, isc_unitario se mantiene en 0.
        }
    }

    // 4. Calcular el monto unitario del Impuesto a la Venta de Arroz Pilado (IVAP).
    let ivap_unitario = 0;
    if (item.igv_afectacion === '17') { // El código '17' del Catálogo 07 es "Gravado - IVAP" [4].
        // El IVAP (Catálogo 05, código 1016) es un tributo distinto al IGV [11].
        // Se aplica sobre el valor de venta unitario neto (sin otros impuestos).
        ivap_unitario = vu_neto_sin_impuestos * (item.ivap_porcentaje / 100);
    }

    // 5. Determinar la base imponible para el cálculo del IGV.
    // El IGV se calcula sobre el valor unitario neto después de descuentos + ISC (si aplica).
    const base_para_igv = vu_neto_sin_impuestos + isc_unitario;

    // 6. Calcular el monto unitario del IGV.
    let igv_unitario = 0;
    // Los códigos 10 al 16 en el Catálogo No. 07 corresponden a operaciones gravadas con IGV [3, 4].
    if (['10', '11', '12', '13', '14', '15', '16'].includes(item.igv_afectacion)) {
        // Se aplica el IGV si la operación es gravada según el Catálogo No. 07.
        igv_unitario = base_para_igv * (item.igv_porcentaje / 100)
    }

    // 7. Calcular el Precio de Venta Unitario final (Punto 38).
    // Es la suma de todos los componentes: Valor Unitario Neto + ISC + IVAP + IGV + ICBPER.
    const final_price_amount = vu_neto_sin_impuestos + isc_unitario + ivap_unitario + igv_unitario + icbper_unitario

    return final_price_amount
}

// --- Tipo de precio --- //
function determinarPriceTypeCode(codigo_tributo) {
    // 1. Si el precio unitario (pu) es 0 Y el código de tributo de la afectación
    //    es '9996' (Gratuito) [2-4], entonces es una operación no onerosa.
    //    Los ejemplos de las fuentes confirman este uso para ítems con precio de 0
    //    y afectaciones como '31', '35', '36'.
    if (codigo_tributo == '9996') {
        return '02'
    }
    // 2. En cualquier otro caso (precio > 0 o afectación no gratuita),
    //    se asume que es una operación onerosa.
    //    Esto incluye ítems gravados ('10'), exonerados ('20') e inafectos onerosos ('30')
    //    con un precio de venta mayor a 0.
    return '01'
}

function determinarDescuentoPorItem(producto) {
    if (!producto.descuento_porcentaje || parseFloat(producto.descuento_porcentaje) === 0) {
        return null;
    }

    const vu = producto.vu;
    const cantidad = producto.cantidad;
    const baseAmount = vu * cantidad;

    const discountPercentageString = producto.descuento_porcentaje.replace('%', '');
    const discountPercentage = parseFloat(discountPercentageString);

    if (isNaN(discountPercentage) || discountPercentage <= 0) {
        return null;
    }

    const multiplierFactorNumeric = discountPercentage / 100;
    const amount = baseAmount * multiplierFactorNumeric;

    return {
        multiplierFactorNumeric: parseFloat(multiplierFactorNumeric.toFixed(5)), // n(3,5)
        amount: parseFloat(amount.toFixed(2)), // n(12,2)
        baseAmount: parseFloat(baseAmount.toFixed(2)) // n(12,2)
    };
}

function determinarTaxTotalPorItem(producto, currencyCode = CURRENCY_CODE) {
    const taxSubtotals = []
    let totalTaxAmount = 0

    // 1. Calcular el valor de venta del ítem (LineExtensionAmount) después del descuento
    const vu = producto.vu
    const cantidad = producto.cantidad
    let valorVentaItem = vu * cantidad // Valor bruto del ítem

    const descuentoAplicado = determinarDescuentoPorItem(producto);
    if (descuentoAplicado) {
        valorVentaItem -= descuentoAplicado.amount // Aplicar descuento al valor bruto del ítem
    }

    // Redondear el valor de venta del ítem para usar como base imponible (n(12,2))
    const taxableAmountRounded = parseFloat(valorVentaItem.toFixed(2));
    const rawTaxableAmount = valorVentaItem; // Usar el valor sin redondear para cálculos intermedios más precisos si es necesario.

    // 2. Procesar IGV
    const igvAfectacion = IGV_AFFECTATION_MAP[producto.igv_afectacion];

    if (!igvAfectacion) {
        console.warn(`Código de afectación IGV '${producto.igv_afectacion}' no encontrado o inválido.`);
        return null;
    }

    let igvAmount = 0;
    if (igvAfectacion.appliesIGV && igvAfectacion.isOnerous) { // Solo si aplica IGV y es operación onerosa
        igvAmount = rawTaxableAmount * IGV_RATE;
        totalTaxAmount += igvAmount;

        taxSubtotals.push({
            cbcTaxableAmount: taxableAmountRounded,
            cbcTaxAmount: parseFloat(igvAmount.toFixed(2)),
            TaxCategory_ID: igvAfectacion.TaxCategory_ID,
            cbcPercent: parseFloat((IGV_RATE * 100).toFixed(2)), // 18.00%
            cbcTaxExemptionReasonCode: producto.igv_afectacion,
            TaxScheme_ID: igvAfectacion.TaxScheme_ID,
            TaxScheme_Name: igvAfectacion.TaxScheme_Name,
            TaxScheme_TypeCode: igvAfectacion.TaxScheme_TypeCode
        });
    } else {
        // Para operaciones exoneradas, inafectas, o gratuitas, el monto del impuesto es 0
        taxSubtotals.push({
            cbcTaxableAmount: taxableAmountRounded, // El valor de venta del ítem es la base imponible nominal.
            cbcTaxAmount: 0.00, // No hay monto de IGV para estas afectaciones
            TaxCategory_ID: igvAfectacion.TaxCategory_ID,
            // cbcPercent: 0.00, // No se suele especificar un porcentaje para 0.00 de IGV.
            cbcTaxExemptionReasonCode: producto.igv_afectacion,
            TaxScheme_ID: igvAfectacion.TaxScheme_ID,
            TaxScheme_Name: igvAfectacion.TaxScheme_Name,
            TaxScheme_TypeCode: igvAfectacion.TaxScheme_TypeCode
        });
    }

    // 3. Procesar ISC (Impuesto Selectivo al Consumo)
    if (producto.isc_porcentaje > 0 || producto.isc_precio_sugerido > 0 || producto.isc_monto_fijo_unitario > 0) {
        let iscAmount = 0;
        let iscSystemType = ''; // Corresponde a cbc:TierRange

        if (producto.isc_precio_sugerido > 0) { // Sistema de Precios de Venta al Público
            // El cálculo de ISC es más complejo y requeriría el precio de venta al público sugerido
            // Para simplificar, si hay un porcentaje, lo aplicamos sobre el valor de venta del ítem.
            // Si el precio sugerido es la base, la lógica sería diferente.
            // Los ejemplos [45] muestran el cálculo del ISC de cerveza con precio sugerido.
            iscSystemType = '03'; // Sistema de Precios de Venta al Público [42]
            // Nota: Este cálculo puede variar mucho dependiendo de la implementación real.
            // Aquí, para mantenerlo manejable con la información de 'producto', si 'isc_precio_sugerido' es la base,
            // el ISC % se aplicaría sobre el valor del precio sugerido y luego multiplicado por la cantidad.
            // No podemos determinar el valor del ISC unitario solo con el precio sugerido y un porcentaje sin más detalles.
            // Por simplicidad para la demo y dado que el producto de la consulta no tiene ISC, usaremos 0 si no se puede calcular.
            iscAmount = 0; // No se puede calcular con los datos simplificados de 'producto'
            console.warn("Cálculo de ISC por precio sugerido es complejo y requiere más datos. Se establecerá en 0.");
        } else if (producto.isc_monto_fijo_unitario > 0) { // Aplicación del Monto Fijo
            iscSystemType = '02'; // Aplicación del Monto Fijo [42]
            iscAmount = producto.isc_monto_fijo_unitario * cantidad;
        } else if (producto.isc_porcentaje > 0) { // Sistema al valor
            iscSystemType = '01'; // Sistema al valor [20]
            iscAmount = rawTaxableAmount * (producto.isc_porcentaje / 100);
        }

        if (iscAmount > 0) {
            totalTaxAmount += iscAmount;
            taxSubtotals.push({
                cbcTaxableAmount: taxableAmountRounded, // Base para ISC
                cbcTaxAmount: parseFloat(iscAmount.toFixed(2)),
                TaxCategory_ID: 'S', // Gravado [11, 33, 46]
                cbcPercent: parseFloat(producto.isc_porcentaje.toFixed(2)),
                cbcTierRange: iscSystemType,
                cbcTaxExemptionReasonCode: '10', // Asumimos gravado por defecto para ISC
                TaxScheme_ID: '2000', // ISC [22, 33, 47, 48]
                TaxScheme_Name: 'ISC',
                TaxScheme_TypeCode: 'EXC' // [22, 33, 47, 49]
            });
        }
    }

    // 4. Procesar IVAP (Impuesto a la Venta de Arroz Pilado)
    if (producto.ivap_porcentaje > 0) {
        const ivapAmount = rawTaxableAmount * (producto.ivap_porcentaje / 100);
        totalTaxAmount += ivapAmount;

        taxSubtotals.push({
            cbcTaxableAmount: taxableAmountRounded,
            cbcTaxAmount: parseFloat(ivapAmount.toFixed(2)),
            TaxCategory_ID: 'S', // Gravado
            cbcPercent: parseFloat(producto.ivap_porcentaje.toFixed(2)),
            cbcTaxExemptionReasonCode: '17', // Gravado - IVAP [38]
            TaxScheme_ID: '1016', // IVAP [47]
            TaxScheme_Name: 'IVAP',
            TaxScheme_TypeCode: 'VAT' // [47]
        });
    }

    // 5. Procesar Impuesto a la Bolsa Plástica (ICBPER)
    if (producto.has_bolsa_tax) {
        // El impuesto a la bolsa plástica es un monto fijo por unidad de bolsa.
        // Asumimos un monto fijo por bolsa (ej. S/. 0.10) si no está en el producto
        // Para este ejemplo, si `has_bolsa_tax` es true, necesitaríamos el monto unitario.
        // Si no está definido en el producto, no podemos calcularlo con certeza.
        const bolsaTaxAmount = 0.10 * cantidad; // Valor de ejemplo
        totalTaxAmount += bolsaTaxAmount;

        taxSubtotals.push({
            cbcTaxableAmount: 0.00, // El ICBPER no tiene una base imponible directa del producto
            cbcTaxAmount: parseFloat(bolsaTaxAmount.toFixed(2)),
            TaxCategory_ID: 'S', // Otros Tributos [16]
            // cbcPercent: N/A o 0.00,
            cbcTaxExemptionReasonCode: '10', // Podría ser '10' si se aplica en operaciones onerosas
            TaxScheme_ID: '7152', // Impuesto a la bolsa plástica [47]
            TaxScheme_Name: 'ICBPER', // Un nombre común, aunque la fuente dice "Impuesto a la bolsa plastica"
            TaxScheme_TypeCode: 'OTH' // [47]
        });
        console.warn("El impuesto a la bolsa plástica requiere un monto unitario. Se usó un valor de ejemplo de S/. 0.10 por unidad.");
    }


    if (taxSubtotals.length === 0) {
        return null; // No hay tributos aplicables para este ítem
    }

    // Construir la estructura final <cac:TaxTotal>
    const finalTaxTotal = {
        cbcTaxAmount: parseFloat(totalTaxAmount.toFixed(2)),
        currencyID: currencyCode,
        TaxSubtotal: taxSubtotals.map(subtotal => ({
            cbcTaxableAmount: subtotal.cbcTaxableAmount,
            currencyID: currencyCode,
            cbcTaxAmount: subtotal.cbcTaxAmount,
            TaxCategory: {
                cbcID: subtotal.TaxCategory_ID,
                schemeID: TAX_SCHEMES_ATTRIBUTES.TaxCategory_schemeID,
                schemeName: TAX_SCHEMES_ATTRIBUTES.TaxCategory_schemeName,
                schemeAgencyName: TAX_SCHEMES_ATTRIBUTES.TaxCategory_schemeAgencyName,
                ...(subtotal.cbcPercent && { cbcPercent: subtotal.cbcPercent }),
                cbcTaxExemptionReasonCode: {
                    value: subtotal.cbcTaxExemptionReasonCode,
                    listAgencyName: "PE:SUNAT",
                    listName: "SUNAT:Codigo de Tipo de Afectación del IGV",
                    listURI: "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07"
                },
                ...(subtotal.cbcTierRange && { cbcTierRange: subtotal.cbcTierRange }),
                TaxScheme: {
                    cbcID: subtotal.TaxScheme_ID,
                    schemeID: TAX_SCHEMES_ATTRIBUTES.schemeID,
                    schemeAgencyID: TAX_SCHEMES_ATTRIBUTES.schemeAgencyID,
                    schemeName: TAX_SCHEMES_ATTRIBUTES.schemeName,
                    cbcName: subtotal.TaxScheme_Name,
                    cbcTaxTypeCode: subtotal.TaxScheme_TypeCode
                }
            }
        }))
    };

    return finalTaxTotal;
}





// -- Impuesto total por item (por todas las cantidades) sin considerar el impuesto a la bolsa --- //
function setTaxAmount(a, codigo_tributo) {
    let value = '';
    switch (codigo_tributo) {
        case '1000':
            value = a.cantidad * (a.vu - a.descuento_vu) * (a.igv_porcentaje / 100)
            break;
        case '9995':
            value = 0
            break;
        case '9996':
            value = 0
            break;
        case '9997':
            value = 0
            break;
        case '9998':
            value = 0
            break;
    }

    return value
}

// TaxAmount impuesto total por item (por todas las cantidades) sin considerar el impuesto a la bolsa
function setTaxByProduct(a, codigo_tributo, totalGratuitaIgv) {
    let value = '';
    switch (codigo_tributo) {
        case '1000':
            value = a.cantidad * (a.vu - a.descuento_vu) * (a.igv_porcentaje / 100)
            break;
        case '9995':
            value = 0
            break;
        case '9996':
            if (totalGratuitaIgv === 0 || totalGratuitaIgv === "") {
                value = 0
            } else {
                value = a.cantidad * (a.vu - a.descuento_vu) * (a.igv_porcentaje / 100)
            }
            break;
        case '9997':
            value = 0
            break;
        case '9998':
            value = 0
            break;
    }
    return value;
}

// function setPriceAmount(a) {
//     const icbper_add = a.has_bolsa_tax == true ? icbper : 0

//     let value = 0
//     if (a.igv_afectacion == '10') {
//         value = ((a.vu - a.descuento_vu) * (1 + (a.igv_porcentaje / 100))) + icbper_add
//     } else {
//         value = a.vu - a.descuento_vu + icbper_add
//     }

//     return value
// }