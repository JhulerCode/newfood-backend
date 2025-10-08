const sistemaData = {
    app_version: '1.5.7',
    documentos_identidad: [
        { id: '6', nombre: 'RUC' },
        { id: '1', nombre: 'DNI' },
        { id: '4', nombre: 'CARNET DE EXTRANJERÍA' },
        { id: '7', nombre: 'PASAPORTE' }
    ],
    colaborador_cargos: [
        { id: 'ADMINISTRADOR' },
        { id: 'CAJERO' },
        { id: 'MOZO' },
        { id: 'CONTADOR' },
        { id: 'REPARTIDOR' },
    ],
    generos: [
        { id: 'M', nombre: 'MASCULINO' },
        { id: 'F', nombre: 'FEMENINO' }
    ],
    activo_estados: [
        { id: true, nombre: 'ACTIVO' },
        { id: false, nombre: 'INACTIVO' }
    ],
    estados: [
        { id: true, nombre: 'SI' },
        { id: false, nombre: 'NO' }
    ],
    unidades: [
        { id: 'NIU', nombre: 'Unidad', nombre_completo: 'Unidad (NIU)' },
        { id: 'KGM', nombre: 'Kilogramo', nombre_completo: 'Kilogramo (KGM)' },
        { id: 'LTR', nombre: 'Litro', nombre_completo: 'Litro (LTR)' },
        { id: 'OZN', nombre: 'Onza', nombre_completo: 'Onza (OZN)' },

    ],
    articulo_tipos: [
        { id: '1', nombre: 'INSUMO' },
        { id: '2', nombre: 'PRODUCTO' },
    ],
    igv_afectaciones: [
        { id: '10', nombre: 'Gravado - Operación Onerosa' },
        { id: '20', nombre: 'Exonerado - Operación Onerosa' },
        { id: '30', nombre: 'Inafecto - Operación Onerosa' }
    ],
    transaccion_estados: [
        { id: '0', nombre: 'ANULADO' },
        { id: '1', nombre: 'ABIERTO' },
        { id: '2', nombre: 'CERRADO' }
    ],
    pago_condiciones: [
        { id: '1', nombre: 'CONTADO' },
        { id: '2', nombre: 'CRÉDITO' },
    ],
    kardex_tipos: [
        { id: '1', nombre: 'COMPRA', operacion: 1 },
        { id: '2', nombre: 'VENTA', operacion: -1 },
        { id: '3', nombre: 'AJUSTE ENTRADA', operacion: 1 },
        { id: '4', nombre: 'AJUSTE SALIDA', operacion: -1 },
    ],
    venta_canales: [
        { id: '1', nombre: 'SALÓN' },
        { id: '2', nombre: 'PARA LLEVAR' },
        { id: '3', nombre: 'DELIVERY' },
    ],
    caja_operacion_tipos: [
        { id: 1, nombre: 'INGRESO' },
        { id: 2, nombre: 'EGRESO' },
    ],
    caja_operaciones: [
        { id: '1', tipo: 1, nombre: 'VENTA' },
        { id: '2', tipo: 1, nombre: 'SALDO INICIAL' },
        { id: '3', tipo: 1, nombre: 'OTROS INGRESOS' },
        { id: '4', tipo: 2, nombre: 'COMPRA' },
        { id: '5', tipo: 2, nombre: 'MANTENIMIENTO' },
        { id: '6', tipo: 2, nombre: 'MOVILIDAD' },
        { id: '7', tipo: 2, nombre: 'SERVICIO' },
        { id: '8', tipo: 2, nombre: 'REMUNERACIÓN' },
        { id: '9', tipo: 2, nombre: 'OTROS EGRESOS' },
    ],
    pago_comprobantes: [
        { id: '01', nombre: 'FACTURA', codigo: 'FACTURA' },
        { id: '03', nombre: 'BOLETA DE VENTA', codigo: 'BOLETA' },
        { id: 'NV', nombre: 'NOTA DE VENTA', codigo: 'NOTA-VENTA' },
    ],
    comprobante_estados: [
        { id: '0', nombre: 'ANULADO' },
        { id: '1', nombre: 'SIN ENVIAR' },
        { id: '2', nombre: 'ENVIADO' },
        { id: '3', nombre: 'ACEPTADO' },
        { id: '4', nombre: 'CANJEADO' },
    ],
    caja_apertura_estados: [
        { id: '1', nombre: 'ABIERTO' },
        { id: '2', nombre: 'CERRADO' },
    ],
    dinero_movimiento_estados: [
        { id: '0', nombre: 'ANULADO' },
        { id: '2', nombre: 'PROCESADO' },
    ],
    impresora_tipos: [
        { id: 1, nombre: 'USB' },
        { id: 2, nombre: 'LAN' },
    ],

    CATALOGO_TRIBUTOS_SUNAT: {
        // IGV
        "10": { "codigo_tributo": "1000", "codigo_internacional": "VAT", "codigo": "IGV", "nombre": "Gravado - Operación Onerosa", "categoria_impuesto_id": "S" }, // Gravado [1]
        "17": { "codigo_tributo": "1016", "codigo_internacional": "VAT", "codigo": "IVAP", "nombre": "Gravado - IVAP", "categoria_impuesto_id": "S" }, // IVAP, también puede ser 9996 [2]

        // Retiros Gravados (comportamiento similar a 'Gravado' si aplica tax)
        "11": { "codigo_tributo": "9996", "codigo_internacional": "FRE", "codigo": "GRA", "nombre": "Gravado – Retiro por premio", "categoria_impuesto_id": "S" }, // Gravado [2]
        "12": { "codigo_tributo": "9996", "codigo_internacional": "FRE", "codigo": "GRA", "nombre": "Gravado – Retiro por donación", "categoria_impuesto_id": "S" }, // Gravado [2]
        "13": { "codigo_tributo": "9996", "codigo_internacional": "FRE", "codigo": "GRA", "nombre": "Gravado – Retiro", "categoria_impuesto_id": "S" }, // Gravado [2]
        "14": { "codigo_tributo": "9996", "codigo_internacional": "FRE", "codigo": "GRA", "nombre": "Gravado – Retiro por publicidad", "categoria_impuesto_id": "S" }, // Gravado [2]
        "15": { "codigo_tributo": "9996", "codigo_internacional": "FRE", "codigo": "GRA", "nombre": "Gravado – Bonificaciones", "categoria_impuesto_id": "S" }, // Gravado [2]
        "16": { "codigo_tributo": "9996", "codigo_internacional": "FRE", "codigo": "GRA", "nombre": "Gravado – Retiro por entrega a trabajadores", "categoria_impuesto_id": "S" }, // Gravado [2]

        // Exonerados
        "20": { "codigo_tributo": "9997", "codigo_internacional": "VAT", "codigo": "EXO", "nombre": "Exonerado - Operación Onerosa", "categoria_impuesto_id": "E" }, // Exonerado [2, 67]
        "21": { "codigo_tributo": "9996", "codigo_internacional": "FRE", "codigo": "GRA", "nombre": "Exonerado - Transferencia gratuita", "categoria_impuesto_id": "E" }, // Exonerado [2]

        // Inafectos
        "30": { "codigo_tributo": "9998", "codigo_internacional": "FRE", "codigo": "INA", "nombre": "Inafecto - Operación Onerosa", "categoria_impuesto_id": "O" }, // Inafecto [2, 73]
        "31": { "codigo_tributo": "9996", "codigo_internacional": "FRE", "codigo": "INA", "nombre": "Inafecto – Retiro por Bonificación", "categoria_impuesto_id": "O" }, // Inafecto [2, 129]
        "32": { "codigo_tributo": "9996", "codigo_internacional": "FRE", "codigo": "INA", "nombre": "Inafecto – Retiro", "categoria_impuesto_id": "O" }, // Inafecto [2]
        "33": { "codigo_tributo": "9996", "codigo_internacional": "FRE", "codigo": "INA", "nombre": "Inafecto – Retiro por Muestras Médicas", "categoria_impuesto_id": "O" }, // Inafecto [2]
        "34": { "codigo_tributo": "9996", "codigo_internacional": "FRE", "codigo": "INA", "nombre": "Inafecto - Retiro por Convenio Colectivo", "categoria_impuesto_id": "O" }, // Inafecto [2]
        "35": { "codigo_tributo": "9996", "codigo_internacional": "FRE", "codigo": "INA", "nombre": "Inafecto – Retiro por premio", "categoria_impuesto_id": "O" }, // Inafecto [3]
        "36": { "codigo_tributo": "9996", "codigo_internacional": "FRE", "codigo": "INA", "nombre": "Inafecto - Retiro por publicidad", "categoria_impuesto_id": "O" }, // Inafecto [3]
        "37": { "codigo_tributo": "9996", "codigo_internacional": "FRE", "codigo": "INA", "nombre": "Inafecto - Transferencia gratuita", "categoria_impuesto_id": "O" }, // Inafecto [3]

        // Exportación
        "40": { "codigo_tributo": "9995", "codigo_internacional": "FRE", "codigo": "EXP", "nombre": "Exportación de Bienes o Servicios", "categoria_impuesto_id": "Z" }, // Exportación [3]

        // Otros Tributos (se asumen códigos específicos, no de afectación IGV)
        "ISC": { "codigo_tributo": "2000", "codigo_internacional": "EXC", "codigo": "ISC", "nombre": "Impuesto Selectivo al Consumo", "categoria_impuesto_id": "S" }, // ISC [4]
        "ICBPER": { "codigo_tributo": "7152", "codigo_internacional": "OTH", "codigo": "ICBPER", "nombre": "Impuesto a la bolsa plastica", "categoria_impuesto_id": "O" }, // Bolsa Plástica [4]
        "OTROS_TRIBUTOS": { "codigo_tributo": "9999", "codigo_internacional": "OTH", "codigo": "OTROS", "nombre": "Otros tributos", "categoria_impuesto_id": "S" } // Otros tributos [4]
    },
    bolsa_tax_unit_amount: 0.5
}

function arrayMap(array) {
    return sistemaData[array].reduce((obj, a) => (obj[a.id] = a, obj), {})
}

const find = async (req, res) => {
    try {
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null
        const data = {}

        if (qry) {
            for (const a of qry) {
                data[a] = sistemaData[a]
            }
        }

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

export default {
    find,
    sistemaData,
    arrayMap,
}