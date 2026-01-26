import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { ComprobanteTipo } from './ComprobanteTipo.js'
import { Sucursal } from './Sucursal.js'
import { Empresa } from './Empresa.js'
import { Colaborador } from './Colaborador.js'

export const SucursalComprobanteTipo = sequelize.define('sucursal_comprobante_tipos', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    sucursal: { type: DataTypes.STRING },
    comprobante_tipo: { type: DataTypes.STRING },
    estado: { type: DataTypes.BOOLEAN, defaultValue: true },

    empresa: { type: DataTypes.STRING },
    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

ComprobanteTipo.hasMany(SucursalComprobanteTipo, { foreignKey: 'comprobante_tipo', as: 'sucursal_comprobante_tipos', onDelete: 'RESTRICT' })
SucursalComprobanteTipo.belongsTo(ComprobanteTipo, { foreignKey: 'comprobante_tipo', as: 'comprobante_tipo1' })

Sucursal.hasMany(SucursalComprobanteTipo, { foreignKey: 'sucursal', as: 'sucursal_comprobante_tipos', onDelete: 'RESTRICT' })
SucursalComprobanteTipo.belongsTo(Sucursal, { foreignKey: 'sucursal', as: 'sucursal1' })

Empresa.hasMany(SucursalComprobanteTipo, { foreignKey: 'empresa', as: 'sucursal_comprobante_tipos', onDelete: 'RESTRICT' })
SucursalComprobanteTipo.belongsTo(Empresa, { foreignKey: 'empresa', as: 'empresa1' })

Colaborador.hasMany(SucursalComprobanteTipo, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
SucursalComprobanteTipo.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(SucursalComprobanteTipo, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
SucursalComprobanteTipo.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })