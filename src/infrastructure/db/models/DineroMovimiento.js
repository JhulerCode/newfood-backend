import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { PagoMetodo } from './PagoMetodo.js'
import { Comprobante } from './Comprobante.js'
import { CajaApertura } from './CajaApertura.js'
import { Transaccion } from './Transaccion.js'
import { Sucursal } from './Sucursal.js'
import { Empresa } from './Empresa.js'
import { Colaborador } from './Colaborador.js'

export const DineroMovimiento = sequelize.define('dinero_movimientos', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    fecha: { type: DataTypes.DATEONLY },
    tipo: { type: DataTypes.SMALLINT },
    operacion: { type: DataTypes.STRING },
    detalle: { type: DataTypes.STRING },

    pago_metodo: { type: DataTypes.STRING },
    monto: { type: DataTypes.DECIMAL(10, 2) },
    estado: { type: DataTypes.STRING, defaultValue: '2' },

    comprobante: { type: DataTypes.STRING },
    caja_apertura: { type: DataTypes.STRING },

    sucursal: { type: DataTypes.STRING },
    empresa: { type: DataTypes.STRING },
    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING },

    monto_real: {
        type: DataTypes.VIRTUAL,
        get() {
            return `${this.tipo == 1 ? this.monto * 1 : this.monto * -1}`
        }
    }
})

PagoMetodo.hasMany(DineroMovimiento, { foreignKey: 'pago_metodo', as: 'dinero_movimientos', onDelete: 'RESTRICT' })
DineroMovimiento.belongsTo(PagoMetodo, { foreignKey: 'pago_metodo', as: 'pago_metodo1' })

Comprobante.hasMany(DineroMovimiento, { foreignKey: 'comprobante', as: 'dinero_movimientos', onDelete: 'RESTRICT' })
DineroMovimiento.belongsTo(Comprobante, { foreignKey: 'comprobante', as: 'comprobante1' })

Transaccion.hasMany(DineroMovimiento, { foreignKey: 'transaccion', as: 'dinero_movimientos', onDelete: 'RESTRICT' })
DineroMovimiento.belongsTo(Transaccion, { foreignKey: 'transaccion', as: 'transaccion1' })

CajaApertura.hasMany(DineroMovimiento, { foreignKey: 'caja_apertura', as: 'dinero_movimientos', onDelete: 'RESTRICT' })
DineroMovimiento.belongsTo(CajaApertura, { foreignKey: 'caja_apertura', as: 'caja_apertura1' })

Sucursal.hasMany(DineroMovimiento, { foreignKey: 'sucursal', as: 'dinero_movimientos', onDelete: 'RESTRICT' })
DineroMovimiento.belongsTo(Sucursal, { foreignKey: 'sucursal', as: 'sucursal1' })

Empresa.hasMany(DineroMovimiento, { foreignKey: 'empresa', as: 'dinero_movimientos', onDelete: 'RESTRICT' })
DineroMovimiento.belongsTo(Empresa, { foreignKey: 'empresa', as: 'empresa1' })

Colaborador.hasMany(DineroMovimiento, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
DineroMovimiento.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(DineroMovimiento, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
DineroMovimiento.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })