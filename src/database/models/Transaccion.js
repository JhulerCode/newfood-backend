import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Socio } from './Socio.js'
import { Articulo } from './Articulo.js'
import { Moneda } from './Moneda.js'
import { Colaborador } from './Colaborador.js'
import { Maquina } from './Maquina.js'

export const Transaccion = sequelize.define('transacciones', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tipo: { type: DataTypes.SMALLINT }, //required
    fecha: { type: DataTypes.DATEONLY }, //required

    socio: { type: DataTypes.STRING }, //required //linked
    guia: { type: DataTypes.STRING }, //required
    factura: { type: DataTypes.STRING }, //required

    pago_condicion: { type: DataTypes.STRING }, //required
    moneda: { type: DataTypes.STRING }, //required //linked
    tipo_cambio: { type: DataTypes.STRING }, //required
    monto: { type: DataTypes.DOUBLE }, //required

    observacion: { type: DataTypes.STRING },
    estado: { type: DataTypes.STRING },

    anulado_motivo: { type: DataTypes.STRING },

    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

Socio.hasMany(Transaccion, { foreignKey: 'socio', as: 'transacciones', onDelete: 'RESTRICT' })
Transaccion.belongsTo(Socio, { foreignKey: 'socio', as: 'socio1' })

Moneda.hasMany(Transaccion, { foreignKey: 'moneda', as: 'transacciones', onDelete: 'RESTRICT' })
Transaccion.belongsTo(Moneda, { foreignKey: 'moneda', as: 'moneda1' })

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
    moneda: { type: DataTypes.STRING }, //required //linked
    tipo_cambio: { type: DataTypes.DOUBLE }, //required

    observacion: { type: DataTypes.STRING },
    estado: { type: DataTypes.STRING },

    transaccion: { type: DataTypes.STRING }, //required //linked

    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

Articulo.hasMany(TransaccionItem, { foreignKey: 'articulo', as: 'transaccion_items', onDelete: 'RESTRICT' })
TransaccionItem.belongsTo(Articulo, { foreignKey: 'articulo', as: 'articulo1' })

Moneda.hasMany(TransaccionItem, { foreignKey: 'moneda', as: 'transaccion_items', onDelete: 'RESTRICT' })
TransaccionItem.belongsTo(Moneda, { foreignKey: 'moneda', as: 'moneda1' })

TransaccionItem.hasMany(TransaccionItem, { foreignKey: 'lote_padre', as: 'lote_padre_items', onDelete: 'RESTRICT' })
TransaccionItem.belongsTo(TransaccionItem, { foreignKey: 'lote_padre', as: 'lote_padre1' })

Transaccion.hasMany(TransaccionItem, { foreignKey: 'transaccion', as: 'transaccion_items', onDelete: 'RESTRICT' })
TransaccionItem.belongsTo(Transaccion, { foreignKey: 'transaccion', as: 'transaccion1' })

ProduccionOrden.hasMany(TransaccionItem, { foreignKey: 'produccion_orden', as: 'transaccion_items', onDelete: 'RESTRICT' })
TransaccionItem.belongsTo(ProduccionOrden, { foreignKey: 'produccion_orden', as: 'produccion_orden1' })

Maquina.hasMany(TransaccionItem, { foreignKey: 'maquina', as: 'transaccion_items', onDelete: 'RESTRICT' })
TransaccionItem.belongsTo(Maquina, { foreignKey: 'maquina', as: 'maquina1' })

Colaborador.hasMany(TransaccionItem, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
TransaccionItem.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(TransaccionItem, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
TransaccionItem.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })