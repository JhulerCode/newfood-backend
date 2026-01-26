import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { PagoMetodo } from './PagoMetodo.js'
import { Sucursal } from './Sucursal.js'
import { Empresa } from './Empresa.js'
import { Colaborador } from './Colaborador.js'

export const SucursalPagoMetodo = sequelize.define('sucursal_pago_metodos', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    sucursal: { type: DataTypes.STRING },
    pago_metodo: { type: DataTypes.STRING },
    estado: { type: DataTypes.BOOLEAN, defaultValue: true },

    empresa: { type: DataTypes.STRING },
    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

PagoMetodo.hasMany(SucursalPagoMetodo, { foreignKey: 'pago_metodo', as: 'sucursal_pago_metodos', onDelete: 'RESTRICT' })
SucursalPagoMetodo.belongsTo(PagoMetodo, { foreignKey: 'pago_metodo', as: 'pago_metodo1' })

Sucursal.hasMany(SucursalPagoMetodo, { foreignKey: 'sucursal', as: 'sucursal_pago_metodos', onDelete: 'RESTRICT' })
SucursalPagoMetodo.belongsTo(Sucursal, { foreignKey: 'sucursal', as: 'sucursal1' })

Empresa.hasMany(SucursalPagoMetodo, { foreignKey: 'empresa', as: 'sucursal_pago_metodos', onDelete: 'RESTRICT' })
SucursalPagoMetodo.belongsTo(Empresa, { foreignKey: 'empresa', as: 'empresa1' })

Colaborador.hasMany(SucursalPagoMetodo, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
SucursalPagoMetodo.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(SucursalPagoMetodo, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
SucursalPagoMetodo.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })