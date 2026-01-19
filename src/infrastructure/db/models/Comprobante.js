import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Socio } from './Socio.js'
import { Articulo } from './Articulo.js'
import { Transaccion } from './Transaccion.js'
import { CajaApertura } from "./CajaApertura.js";
import { Empresa } from './Empresa.js'
import { Colaborador } from './Colaborador.js'
import { ComprobanteTipo } from './ComprobanteTipo.js'

export const Comprobante = sequelize.define('comprobantes', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    // empresa_telefono: { type: DataTypes.STRING },
    socio: { type: DataTypes.STRING },
    pago_condicion: { type: DataTypes.STRING },
    transaccion: { type: DataTypes.STRING },
    caja_apertura: { type: DataTypes.STRING },
    estado: { type: DataTypes.STRING },
    anulado_motivo: { type: DataTypes.STRING },
    canjeado_por: { type: DataTypes.STRING },

    empresa_datos: { type: DataTypes.JSON },
    cliente_datos: { type: DataTypes.JSON },

    doc_tipo: { type: DataTypes.STRING },
    serie: { type: DataTypes.STRING },
    numero: { type: DataTypes.STRING },
    fecha_emision: { type: DataTypes.DATEONLY },
    hora_emision: { type: DataTypes.TIME },
    fecha_vencimiento: { type: DataTypes.STRING },
    moneda: { type: DataTypes.STRING },

    // sub_total_ventas: { type: DataTypes.DECIMAL(10, 2) },
    // anticipos: { type: DataTypes.DECIMAL(10, 2) },
    // descuentos: { type: DataTypes.DECIMAL(10, 2) },
    // valor_venta: { type: DataTypes.DECIMAL(10, 2) },
    // isc: { type: DataTypes.DECIMAL(10, 2) },
    // igv: { type: DataTypes.DECIMAL(10, 2) },
    // icbper: { type: DataTypes.DECIMAL(10, 2) },
    // otros_cargos: { type: DataTypes.DECIMAL(10, 2) },
    // otros_tributos: { type: DataTypes.DECIMAL(10, 2) },

    gravado: { type: DataTypes.DECIMAL(10, 2) },
    exonerado: { type: DataTypes.DECIMAL(10, 2) },
    inafecto: { type: DataTypes.DECIMAL(10, 2) },
    gratuito: { type: DataTypes.DECIMAL(10, 2) },
    descuentos: { type: DataTypes.DECIMAL(10, 2) },
    igv: { type: DataTypes.DECIMAL(10, 2) },
    isc: { type: DataTypes.DECIMAL(10, 2) },
    icbper: { type: DataTypes.DECIMAL(10, 2) },

    monto: { type: DataTypes.DECIMAL(10, 2) },
    nota: { type: DataTypes.STRING },

    sunat_respuesta_codigo: { type: DataTypes.STRING },
    sunat_respuesta_nota: { type: DataTypes.STRING },
    sunat_respuesta_descripcion: { type: DataTypes.STRING },
    hash: { type: DataTypes.STRING },

    empresa: { type: DataTypes.STRING },
    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING },

    serie_correlativo: {
        type: DataTypes.VIRTUAL,
        get() {
            return `${this.serie}-${this.numero}`
        },
    },
})

ComprobanteTipo.hasMany(Comprobante, { foreignKey: 'doc_tipo', as: 'comprobantes', onDelete: 'RESTRICT' })
Comprobante.belongsTo(ComprobanteTipo, { foreignKey: 'doc_tipo', as: 'doc_tipo1' })

Socio.hasMany(Comprobante, { foreignKey: 'socio', as: 'comprobantes', onDelete: 'RESTRICT' })
Comprobante.belongsTo(Socio, { foreignKey: 'socio', as: 'socio1' })

Transaccion.hasMany(Comprobante, { foreignKey: 'transaccion', as: 'comprobantes', onDelete: 'RESTRICT' })
Comprobante.belongsTo(Transaccion, { foreignKey: 'transaccion', as: 'transaccion1' })

CajaApertura.hasMany(Comprobante, { foreignKey: 'caja_apertura', as: 'comprobantes', onDelete: 'RESTRICT' })
Comprobante.belongsTo(CajaApertura, { foreignKey: 'caja_apertura', as: 'caja_apertura1' })

Comprobante.hasOne(Comprobante, { foreignKey: 'canjeado_por', as: 'comprobante_inicial', onDelete: 'RESTRICT' })
Comprobante.belongsTo(Comprobante, { foreignKey: 'canjeado_por', as: 'canjeado_por1' })

Empresa.hasMany(Comprobante, { foreignKey: 'empresa', as: 'comprobantes', onDelete: 'RESTRICT' })
Comprobante.belongsTo(Empresa, { foreignKey: 'empresa', as: 'empresa1' })

Colaborador.hasMany(Comprobante, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
Comprobante.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(Comprobante, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
Comprobante.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })



export const ComprobanteItem = sequelize.define('comprobante_items', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    articulo: { type: DataTypes.STRING },
    descripcion: { type: DataTypes.STRING },
    codigo: { type: DataTypes.STRING },
    codigo_sunat: { type: DataTypes.STRING },
    unidad: { type: DataTypes.STRING },
    cantidad: { type: DataTypes.DOUBLE },

    pu: { type: DataTypes.DOUBLE },
    descuento_tipo: { type: DataTypes.STRING },
    descuento_valor: { type: DataTypes.DOUBLE },

    igv_afectacion: { type: DataTypes.STRING },
    igv_porcentaje: { type: DataTypes.DOUBLE },
    isc_porcentaje: { type: DataTypes.DOUBLE },
    isc_monto_fijo_uni: { type: DataTypes.DOUBLE },
    has_bolsa_tax: { type: DataTypes.BOOLEAN },

    // vu: { type: DataTypes.DOUBLE },
    // descuento_vu: { type: DataTypes.DOUBLE },
    comprobante: { type: DataTypes.STRING },

    empresa: { type: DataTypes.STRING },
    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

Articulo.hasMany(ComprobanteItem, { foreignKey: 'articulo', as: 'comprobante_items', onDelete: 'RESTRICT' })
ComprobanteItem.belongsTo(Articulo, { foreignKey: 'articulo', as: 'articulo1' })

Comprobante.hasMany(ComprobanteItem, { foreignKey: 'comprobante', as: 'comprobante_items', onDelete: 'RESTRICT' })
ComprobanteItem.belongsTo(Comprobante, { foreignKey: 'comprobante', as: 'comprobante1' })

Empresa.hasMany(ComprobanteItem, { foreignKey: 'empresa', as: 'comprobante_items', onDelete: 'RESTRICT' })
ComprobanteItem.belongsTo(Empresa, { foreignKey: 'empresa', as: 'empresa1' })

Colaborador.hasMany(ComprobanteItem, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
ComprobanteItem.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(ComprobanteItem, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
ComprobanteItem.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })