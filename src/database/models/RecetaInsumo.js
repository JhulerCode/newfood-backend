import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Articulo } from './Articulo.js'
import { Empresa } from './Empresa.js'
import { Colaborador } from './Colaborador.js'

export const RecetaInsumo = sequelize.define('receta_insumos', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    articulo_principal: { type: DataTypes.STRING },
    articulo: { type: DataTypes.STRING },
    cantidad: { type: DataTypes.DOUBLE },
    orden: { type: DataTypes.INTEGER },

    empresa: { type: DataTypes.STRING },
    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING },
})

Articulo.hasMany(RecetaInsumo, { foreignKey: 'articulo_principal', as: 'receta_insumos', onDelete: 'RESTRICT' })
RecetaInsumo.belongsTo(Articulo, { foreignKey: 'articulo_principal', as: 'articulo_principal1' })

Articulo.hasMany(RecetaInsumo, { foreignKey: 'articulo', as: 'articulos_principales', onDelete: 'RESTRICT' })
RecetaInsumo.belongsTo(Articulo, { foreignKey: 'articulo', as: 'articulo1' })

Empresa.hasMany(RecetaInsumo, { foreignKey: 'empresa', as: 'receta_insumos', onDelete: 'RESTRICT' })
RecetaInsumo.belongsTo(Empresa, { foreignKey: 'empresa', as: 'empresa1' })

Colaborador.hasMany(RecetaInsumo, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
RecetaInsumo.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(RecetaInsumo, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
RecetaInsumo.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })