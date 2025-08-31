import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { PagoMetodo } from './PagoMetodo.js'
import { Comprobante } from './Comprobante.js'
import { CajaApertura } from './CajaApertura.js'
import { Transaccion } from './Transaccion.js'
// import { Caja } from '../locales/Caja.js'

export const DineroMovimiento = sequelize.define('dinero_movimientos', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    fecha: { type: DataTypes.DATE },
    
    tipo: { type: DataTypes.SMALLINT },
    operacion: { type: DataTypes.STRING }, //linked
    detalle: { type: DataTypes.STRING },
    
    pago_metodo: { type: DataTypes.STRING }, //linked
    monto: { type: DataTypes.DOUBLE },

    comprobante: { type: DataTypes.STRING }, //linked
    transaccion: { type: DataTypes.STRING }, //linked
    caja_apertura: { type: DataTypes.STRING }, //linked
    // caja: { type: DataTypes.STRING }, //linked //required

    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

PagoMetodo.hasMany(DineroMovimiento, { foreignKey: 'pago_metodo', as: 'dinero_movimientos', onDelete: 'RESTRICT' })
DineroMovimiento.belongsTo(PagoMetodo, { foreignKey: 'pago_metodo', as: 'pago_metodo1' })

Comprobante.hasMany(DineroMovimiento, { foreignKey: 'comprobante', as: 'dinero_movimientos', onDelete: 'RESTRICT' })
DineroMovimiento.belongsTo(Comprobante, { foreignKey: 'comprobante', as: 'comprobante1' })

Transaccion.hasMany(DineroMovimiento, { foreignKey: 'transaccion', as: 'dinero_movimientos', onDelete: 'RESTRICT' })
DineroMovimiento.belongsTo(Transaccion, { foreignKey: 'transaccion', as: 'transaccion1' })

CajaApertura.hasMany(DineroMovimiento, { foreignKey: 'caja_apertura', as: 'dinero_movimientos', onDelete: 'RESTRICT' })
DineroMovimiento.belongsTo(CajaApertura, { foreignKey: 'caja_apertura', as: 'caja_apertura1' })
