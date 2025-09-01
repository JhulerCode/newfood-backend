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
        // { id: 'GRM', nombre: 'Gramo', nombre_completo: 'Gramo (GRM)' },
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
    venta_caneles: [
        { id: '1', nombre: 'Salón' },
        { id: '2', nombre: 'Para llevar' },
        { id: '3', nombre: 'Delivery' },
    ],
    caja_operaciones: [
        { id: 1, tipo: 1, nombre: 'VENTA'},
        { id: 2, tipo: 1, nombre: 'SALDO INICIAL'},
        { id: 3, tipo: 1, nombre: 'OTRO'},
        { id: 4, tipo: 2, nombre: 'COMPRA'},
        { id: 5, tipo: 2, nombre: 'MANTENIMIENTO'},
        { id: 6, tipo: 2, nombre: 'MOVILIDAD'},
        { id: 7, tipo: 2, nombre: 'SERVICIO'},
        { id: 8, tipo: 2, nombre: 'REMUNERACIÓN'},
        { id: 9, tipo: 2, nombre: 'OTROS'},
    ],
    pago_comprobantes: [
        { id: '01', nombre: 'FACTURA' },
        { id: '03', nombre: 'BOLETA' },
        { id: 'NV', nombre: 'NOTA DE VENTA' },
    ]






    // produccion_tipos: [
    //     { id: 1, nombre: 'FILTRANTE' },
    //     { id: 2, nombre: 'GRANEL' },
    //     { id: 3, nombre: 'PIRAMIDAL' }
    // ],
    // produccion_orden_estados: [
    //     { id: '0', nombre: 'ANULADO' },
    //     { id: '1', nombre: 'ABIERTO' },
    //     { id: '2', nombre: 'CERRADO' }
    // ],
    // documentos_estados: [
    //     { id: '0', nombre: 'VENCIDO' },
    //     { id: '0.1', nombre: 'VENCE HOY' },
    //     { id: '1', nombre: 'POR VENCER' },
    //     { id: '2', nombre: 'VIGENTE' },
    // ],

    // caja_apertura_estados: [
    //     { id: '1', nombre: 'ABIERTO' },
    //     { id: '2', nombre: 'CERRADO' },
    // ],
    // cuarentena_productos_estados: [
    //     { id: '0', nombre: 'ANULADO' },
    //     { id: '1', nombre: 'PENDIENTE' },
    //     { id: '2', nombre: 'ACEPTADO' }
    // ],

    // conformidad_estados: [
    //     { id: '1', nombre: 'CONFORME' },
    //     { id: '2', nombre: 'NO CONFORME' },
    // ],
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