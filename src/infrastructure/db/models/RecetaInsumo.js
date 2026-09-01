import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Articulo } from './Articulo.js'
import { ArticuloVariant } from './ArticuloVariant.js'
import { Empresa } from './Empresa.js'
import { Colaborador } from './Colaborador.js'

export const RecetaInsumo = sequelize.define(
    'receta_insumos',
    {
        id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        articulo_principal: { type: DataTypes.STRING },
        articulo_principal_variant: { type: DataTypes.STRING },
        articulo: { type: DataTypes.STRING },
        articulo_variant: { type: DataTypes.STRING },
        cantidad: { type: DataTypes.DOUBLE },
        orden: { type: DataTypes.INTEGER },

        empresa: { type: DataTypes.STRING, allowNull: false },
        createdBy: { type: DataTypes.STRING },
        updatedBy: { type: DataTypes.STRING },
    },
    {
        indexes: [
            {
                name: 'receta_insumos_principal_variant_idx',
                fields: ['articulo_principal_variant'],
            },
            {
                name: 'receta_insumos_articulo_variant_idx',
                fields: ['articulo_variant'],
            },
            {
                name: 'receta_insumos_principal_componente_unique',
                unique: true,
                fields: ['empresa', 'articulo_principal_variant', 'articulo_variant'],
            },
        ],
    },
)

Articulo.hasMany(RecetaInsumo, {
    foreignKey: 'articulo_principal',
    as: 'receta_insumos',
    onDelete: 'RESTRICT',
})
RecetaInsumo.belongsTo(Articulo, { foreignKey: 'articulo_principal', as: 'articulo_principal1' })

Articulo.hasMany(RecetaInsumo, {
    foreignKey: 'articulo',
    as: 'articulos_principales',
    onDelete: 'RESTRICT',
})
RecetaInsumo.belongsTo(Articulo, { foreignKey: 'articulo', as: 'articulo1' })

ArticuloVariant.hasMany(RecetaInsumo, {
    foreignKey: 'articulo_principal_variant',
    as: 'receta_insumos',
    onDelete: 'RESTRICT',
})
RecetaInsumo.belongsTo(ArticuloVariant, {
    foreignKey: 'articulo_principal_variant',
    as: 'articulo_principal_variant1',
})

ArticuloVariant.hasMany(RecetaInsumo, {
    foreignKey: 'articulo_variant',
    as: 'recetas_componente',
    onDelete: 'RESTRICT',
})
RecetaInsumo.belongsTo(ArticuloVariant, {
    foreignKey: 'articulo_variant',
    as: 'articulo_variant1',
})

Empresa.hasMany(RecetaInsumo, { foreignKey: 'empresa', as: 'receta_insumos', onDelete: 'RESTRICT' })
RecetaInsumo.belongsTo(Empresa, { foreignKey: 'empresa', as: 'empresa1' })

Colaborador.hasMany(RecetaInsumo, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
RecetaInsumo.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(RecetaInsumo, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
RecetaInsumo.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })
