import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Articulo } from './Articulo.js'
import { Sucursal } from './Sucursal.js'
import { Empresa } from './Empresa.js'
import { Colaborador } from './Colaborador.js'

export const SucursalArticulo = sequelize.define('sucursal_articulos', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    sucursal: { type: DataTypes.STRING },
    articulo: { type: DataTypes.STRING },
    estado: { type: DataTypes.BOOLEAN, defaultValue: true },
    stock: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },

    empresa: { type: DataTypes.STRING },
    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

Articulo.hasMany(SucursalArticulo, { foreignKey: 'articulo', as: 'sucursal_articulos', onDelete: 'RESTRICT' })
SucursalArticulo.belongsTo(Articulo, { foreignKey: 'articulo', as: 'articulo1' })

Sucursal.hasMany(SucursalArticulo, { foreignKey: 'sucursal', as: 'sucursal_articulos', onDelete: 'RESTRICT' })
SucursalArticulo.belongsTo(Sucursal, { foreignKey: 'sucursal', as: 'sucursal1' })

Empresa.hasMany(SucursalArticulo, { foreignKey: 'empresa', as: 'sucursal_articulos', onDelete: 'RESTRICT' })
SucursalArticulo.belongsTo(Empresa, { foreignKey: 'empresa', as: 'empresa1' })

Colaborador.hasMany(SucursalArticulo, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
SucursalArticulo.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(SucursalArticulo, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
SucursalArticulo.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })