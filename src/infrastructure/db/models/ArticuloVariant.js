import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Articulo } from './Articulo.js'
import { Empresa } from './Empresa.js'
import { Colaborador } from './Colaborador.js'

export const ArticuloVariant = sequelize.define('articulo_variants', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    articulo: { type: DataTypes.STRING },
    sku: { type: DataTypes.STRING },
    codigo_barras: { type: DataTypes.STRING },
    different_price: { type: DataTypes.BOOLEAN, defaultValue: false },
    price: { type: DataTypes.DOUBLE },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true },

    empresa: { type: DataTypes.STRING },
    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING },
})

Articulo.hasMany(ArticuloVariant, {
    foreignKey: 'articulo',
    as: 'articulo_variants',
    onDelete: 'RESTRICT',
})
ArticuloVariant.belongsTo(Articulo, { foreignKey: 'articulo', as: 'articulo1' })

Empresa.hasMany(ArticuloVariant, {
    foreignKey: 'empresa',
    as: 'articulo_variants',
    onDelete: 'RESTRICT',
})
ArticuloVariant.belongsTo(Empresa, { foreignKey: 'empresa', as: 'empresa1' })

Colaborador.hasMany(ArticuloVariant, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
ArticuloVariant.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(ArticuloVariant, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
ArticuloVariant.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })
