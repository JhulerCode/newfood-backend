const sistemaData = {
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
        { id: 1, nombre: 'CONTADO' },
        { id: 2, nombre: 'CRÉDITO' },
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
        { id: '01', nombre: 'FACTURA' },
        { id: '03', nombre: 'BOLETA' },
        { id: 'NV', nombre: 'NOTA DE VENTA' },
    ],
    comprobante_estados: [
        { id: '0', nombre: 'ANULADO' },
        { id: '1', nombre: 'SIN ENVIAR' },
        { id: '2', nombre: 'ACEPTADO' },
        { id: '3', nombre: 'CANJEADO' },
    ],
    caja_apertura_estados: [
        { id: '1', nombre: 'ABIERTO' },
        { id: '2', nombre: 'CERRADO' },
    ],
    dinero_movimiento_estados: [
        { id: '0', nombre: 'ANULADO' },
        { id: '2', nombre: 'PROCESADO' },
    ]
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