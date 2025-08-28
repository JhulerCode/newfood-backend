import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Socio } from './Socio.js'
import { Articulo } from './Articulo.js'
import { Colaborador } from './Colaborador.js'
import { PagoComprobante } from './PagoComprobante.js'

export const Transaccion = sequelize.define('transacciones', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tipo: { type: DataTypes.SMALLINT }, //required
    fecha: { type: DataTypes.DATEONLY }, //required
    socio: { type: DataTypes.STRING }, //required //linked

    pago_comprobante: { type: DataTypes.STRING },
    pago_comprobante_serie: { type: DataTypes.STRING },
    pago_comprobante_correlativo: { type: DataTypes.STRING },

    pago_condicion: { type: DataTypes.STRING }, //required
    monto: { type: DataTypes.DECIMAL(10, 2) }, //required

    observacion: { type: DataTypes.STRING },
    estado: { type: DataTypes.STRING },

    anulado_motivo: { type: DataTypes.STRING },

    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

Socio.hasMany(Transaccion, { foreignKey: 'socio', as: 'transacciones', onDelete: 'RESTRICT' })
Transaccion.belongsTo(Socio, { foreignKey: 'socio', as: 'socio1' })

PagoComprobante.hasMany(Transaccion, { foreignKey: 'pago_comprobante', as: 'transacciones', onDelete: 'RESTRICT' })
Transaccion.belongsTo(PagoComprobante, { foreignKey: 'pago_comprobante', as: 'pago_comprobante1' })

Colaborador.hasMany(Transaccion, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
Transaccion.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(Transaccion, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
Transaccion.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })



export const TransaccionItem = sequelize.define('transaccion_items', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tipo: { type: DataTypes.SMALLINT }, //required
    fecha: { type: DataTypes.DATEONLY }, //required

    articulo: { type: DataTypes.STRING }, //required //linked
    cantidad: { type: DataTypes.DOUBLE }, //required

    pu: { type: DataTypes.DOUBLE }, //required
    igv_afectacion: { type: DataTypes.STRING }, //required
    igv_porcentaje: { type: DataTypes.DOUBLE }, //required

    observacion: { type: DataTypes.STRING },

    transaccion: { type: DataTypes.STRING }, //required //linked

    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

Articulo.hasMany(TransaccionItem, { foreignKey: 'articulo', as: 'transaccion_items', onDelete: 'RESTRICT' })
TransaccionItem.belongsTo(Articulo, { foreignKey: 'articulo', as: 'articulo1' })

Transaccion.hasMany(TransaccionItem, { foreignKey: 'transaccion', as: 'transaccion_items', onDelete: 'RESTRICT' })
TransaccionItem.belongsTo(Transaccion, { foreignKey: 'transaccion', as: 'transaccion1' })

Colaborador.hasMany(TransaccionItem, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
TransaccionItem.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(TransaccionItem, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
TransaccionItem.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })