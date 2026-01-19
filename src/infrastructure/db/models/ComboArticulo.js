import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Articulo } from './Articulo.js'
import { Empresa } from './Empresa.js'
import { Colaborador } from './Colaborador.js'

export const ComboArticulo = sequelize.define('combo_articulos', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    articulo_principal: { type: DataTypes.STRING },
    articulo: { type: DataTypes.STRING },
    cantidad: { type: DataTypes.DOUBLE },
    orden: { type: DataTypes.INTEGER },

    empresa: { type: DataTypes.STRING },
    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING },
})

Articulo.hasMany(ComboArticulo, { foreignKey: 'articulo_principal', as: 'combo_articulos', onDelete: 'RESTRICT' })
ComboArticulo.belongsTo(Articulo, { foreignKey: 'articulo_principal', as: 'articulo_principal1' })

Articulo.hasMany(ComboArticulo, { foreignKey: 'articulo', as: 'combos', onDelete: 'RESTRICT' })
ComboArticulo.belongsTo(Articulo, { foreignKey: 'articulo', as: 'articulo1' })

Empresa.hasMany(ComboArticulo, { foreignKey: 'empresa', as: 'combo_articulos', onDelete: 'RESTRICT' })
ComboArticulo.belongsTo(Empresa, { foreignKey: 'empresa', as: 'empresa1' })

Colaborador.hasMany(ComboArticulo, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
ComboArticulo.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(ComboArticulo, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
ComboArticulo.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })