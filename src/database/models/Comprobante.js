import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Socio } from './Socio.js'
import { Articulo } from './Articulo.js'
import { Colaborador } from './Colaborador.js'
import { Transaccion } from './Transaccion.js'

export const Comprobante = sequelize.define('comprobantes', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    // empresa_telefono: { type: DataTypes.STRING },
    socio: { type: DataTypes.STRING },
    pago_condicion: { type: DataTypes.STRING },
    transaccion: { type: DataTypes.STRING },
    caja_apertura: { type: DataTypes.STRING },
    estado: { type: DataTypes.STRING },
    canjeado_por: { type: DataTypes.STRING },

    empresa: { type: DataTypes.JSON },
    cliente: { type: DataTypes.JSON },
    
    doc_tipo: { type: DataTypes.STRING },
    serie: { type: DataTypes.STRING },
    numero: { type: DataTypes.STRING },
    fecha_emision: { type: DataTypes.DATEONLY },
    hora_emision: { type: DataTypes.TIME },
    fecha_vencimiento: { type: DataTypes.STRING },
    moneda: { type: DataTypes.STRING },

    sub_total_ventas: { type: DataTypes.DECIMAL(10, 2) },
    anticipos: { type: DataTypes.DECIMAL(10, 2) },
    descuentos: { type: DataTypes.DECIMAL(10, 2) },
    valor_venta: { type: DataTypes.DECIMAL(10, 2) },
    isc: { type: DataTypes.DECIMAL(10, 2) },
    igv: { type: DataTypes.DECIMAL(10, 2) },
    icbper: { type: DataTypes.DECIMAL(10, 2) },
    otros_cargos: { type: DataTypes.DECIMAL(10, 2) },
    otros_tributos: { type: DataTypes.DECIMAL(10, 2) },
    monto: { type: DataTypes.DECIMAL(10, 2) },
    nota: { type: DataTypes.STRING },

    sunat_respuesta_codigo: { type: DataTypes.STRING },
    sunat_respuesta_descripcion: { type: DataTypes.STRING },
    hash: { type: DataTypes.STRING },

    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING },

    serie_correlativo: {
        type: DataTypes.VIRTUAL,
        get() {
            return `${this.serie}-${this.numero}`
        },
    },
})

Socio.hasMany(Comprobante, { foreignKey: 'socio', as: 'comprobantes', onDelete: 'RESTRICT' })
Comprobante.belongsTo(Socio, { foreignKey: 'socio', as: 'socio1' })

Transaccion.hasMany(Comprobante, { foreignKey: 'transaccion', as: 'comprobantes', onDelete: 'RESTRICT' })
Comprobante.belongsTo(Transaccion, { foreignKey: 'transaccion', as: 'transaccion1' })

Comprobante.hasOne(Comprobante, { foreignKey: 'canjeado_por', as: 'comprobante_inicial', onDelete: 'RESTRICT' })
Comprobante.belongsTo(Comprobante, { foreignKey: 'canjeado_por', as: 'canjeado_por1' })

Colaborador.hasMany(Comprobante, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
Comprobante.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(Comprobante, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
Comprobante.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })



export const ComprobanteItem = sequelize.define('comprobante_items', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    articulo: { type: DataTypes.STRING },
    pu: { type: DataTypes.DOUBLE },
    igv_porcentaje: { type: DataTypes.DOUBLE },
    descuento_tipo: { type: DataTypes.STRING },
    descuento_valor: { type: DataTypes.DOUBLE },

    descripcion: { type: DataTypes.STRING },
    unidad: { type: DataTypes.STRING },
    cantidad: { type: DataTypes.DOUBLE },
    vu: { type: DataTypes.DOUBLE },
    descuento_vu: { type: DataTypes.DOUBLE },
    igv_afectacion: { type: DataTypes.STRING },
    codigo_sunat: { type: DataTypes.STRING },
    codigo: { type: DataTypes.STRING },
    has_bolsa_tax: { type: DataTypes.BOOLEAN },

    comprobante: { type: DataTypes.STRING },

    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

Articulo.hasMany(ComprobanteItem, { foreignKey: 'articulo', as: 'comprobante_items', onDelete: 'RESTRICT' })
ComprobanteItem.belongsTo(Articulo, { foreignKey: 'articulo', as: 'articulo1' })

Comprobante.hasMany(ComprobanteItem, { foreignKey: 'comprobante', as: 'comprobante_items', onDelete: 'RESTRICT' })
ComprobanteItem.belongsTo(Comprobante, { foreignKey: 'comprobante', as: 'comprobante1' })

Colaborador.hasMany(ComprobanteItem, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
ComprobanteItem.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(ComprobanteItem, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
ComprobanteItem.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })