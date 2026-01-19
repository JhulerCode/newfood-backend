import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Empresa } from './Empresa.js'
import { Colaborador } from './Colaborador.js'

export const ArticuloCategoria = sequelize.define('articulo_categorias', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tipo: { type: DataTypes.STRING },
    nombre: { type: DataTypes.STRING },
    color: { type: DataTypes.STRING },
    activo: { type: DataTypes.BOOLEAN },

    empresa: { type: DataTypes.STRING },
    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

Empresa.hasMany(ArticuloCategoria, { foreignKey: 'empresa', as: 'articulo_categorias', onDelete: 'RESTRICT' })
ArticuloCategoria.belongsTo(Empresa, { foreignKey: 'empresa', as: 'empresa1' })

Colaborador.hasMany(ArticuloCategoria, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
ArticuloCategoria.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(ArticuloCategoria, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
ArticuloCategoria.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })