import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Socio } from './Socio.js'
import { Articulo } from './Articulo.js'
import { Colaborador } from './Colaborador.js'
import { Transaccion } from './Transaccion.js'

export const Comprobante = sequelize.define('comprobantes', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    socio: { type: DataTypes.STRING }, //linked
    pago_condicion: { type: DataTypes.STRING },
    monto: { type: DataTypes.DECIMAL(10, 2) },
    transaccion: { type: DataTypes.STRING }, //linked
    estado: { type: DataTypes.STRING },

    empresa_ruc: { type: DataTypes.STRING },
    empresa_razon_social: { type: DataTypes.STRING },
    empresa_nombre_comercial: { type: DataTypes.STRING },
    empresa_domicilio_fiscal: { type: DataTypes.STRING },
    empresa_ubigeo: { type: DataTypes.STRING },
    empresa_urbanizacion: { type: DataTypes.STRING },
    empresa_distrito: { type: DataTypes.STRING },
    empresa_provincia: { type: DataTypes.STRING },
    empresa_departamento: { type: DataTypes.STRING },
    empresa_modo: { type: DataTypes.STRING },
    empresa_usu_secundario_produccion_user: { type: DataTypes.STRING },
    empresa_usu_secundario_produccion_password: { type: DataTypes.STRING },

    cliente_razon_social_nombres: { type: DataTypes.STRING },
    cliente_numero_documento: { type: DataTypes.STRING },
    cliente_codigo_tipo_entidad: { type: DataTypes.STRING },
    cliente_cliente_direccion: { type: DataTypes.STRING },

    venta_serie: { type: DataTypes.STRING },
    venta_numero: { type: DataTypes.STRING },
    venta_fecha_emision: { type: DataTypes.DATEONLY },
    venta_hora_emision: { type: DataTypes.TIME },
    venta_fecha_vencimiento: { type: DataTypes.STRING },
    venta_moneda_id: { type: DataTypes.STRING },
    venta_forma_pago_id: { type: DataTypes.STRING },
    venta_total_gravada: { type: DataTypes.DECIMAL(10, 2) },
    venta_total_igv: { type: DataTypes.DECIMAL(10, 2) },
    venta_total_exonerada: { type: DataTypes.DECIMAL(10, 2) },
    venta_total_inafecta: { type: DataTypes.DECIMAL(10, 2) },
    venta_tipo_documento_codigo: { type: DataTypes.STRING },
    venta_nota: { type: DataTypes.STRING },

    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING },

    serie_correlativo: {
        type: DataTypes.VIRTUAL,
        get() {
            return `${this.venta_serie}-${this.venta_numero}`
        },
    },
})

Socio.hasMany(Comprobante, { foreignKey: 'socio', as: 'comprobantes', onDelete: 'RESTRICT' })
Comprobante.belongsTo(Socio, { foreignKey: 'socio', as: 'socio1' })

Transaccion.hasMany(Comprobante, { foreignKey: 'transaccion', as: 'comprobantes', onDelete: 'RESTRICT' })
Comprobante.belongsTo(Transaccion, { foreignKey: 'transaccion', as: 'transaccion1' })

Colaborador.hasMany(Comprobante, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
Comprobante.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(Comprobante, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
Comprobante.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })



export const ComprobanteItem = sequelize.define('comprobante_items', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    articulo: { type: DataTypes.STRING },
    pu: { type: DataTypes.DECIMAL(10, 2) },
    igv_porcentaje: { type: DataTypes.DOUBLE },
    descuento_tipo: { type: DataTypes.STRING },
    descuento_valor: { type: DataTypes.DOUBLE },

    producto: { type: DataTypes.STRING },
    codigo_unidad: { type: DataTypes.STRING },
    cantidad: { type: DataTypes.DECIMAL(10, 2) },
    precio_base: { type: DataTypes.DECIMAL(10, 2) },
    tipo_igv_codigo: { type: DataTypes.STRING },
    codigo_sunat: { type: DataTypes.STRING },
    codigo_producto: { type: DataTypes.STRING },

    comprobante: { type: DataTypes.STRING }, //required //linked

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