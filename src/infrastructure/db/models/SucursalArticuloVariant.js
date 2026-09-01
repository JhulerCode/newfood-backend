import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Articulo } from './Articulo.js'
import { ArticuloVariant } from './ArticuloVariant.js'
import { Sucursal } from './Sucursal.js'
import { Empresa } from './Empresa.js'
import { Colaborador } from './Colaborador.js'

export const SucursalArticuloVariant = sequelize.define(
    'sucursal_articulo_variants',
    {
        id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        sucursal: { type: DataTypes.STRING, allowNull: false },
        articulo: { type: DataTypes.STRING, allowNull: false },
        articulo_variant: { type: DataTypes.STRING, allowNull: false },
        estado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        stock: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },

        empresa: { type: DataTypes.STRING, allowNull: false },
        createdBy: { type: DataTypes.STRING },
        updatedBy: { type: DataTypes.STRING },
    },
    {
        indexes: [
            {
                unique: true,
                fields: ['sucursal', 'articulo_variant'],
            },
        ],
    },
)

Articulo.hasMany(SucursalArticuloVariant, {
    foreignKey: 'articulo',
    as: 'sucursal_articulo_variants',
    onDelete: 'RESTRICT',
})
SucursalArticuloVariant.belongsTo(Articulo, { foreignKey: 'articulo', as: 'articulo1' })

ArticuloVariant.hasMany(SucursalArticuloVariant, {
    foreignKey: 'articulo_variant',
    as: 'sucursal_articulo_variants',
    onDelete: 'RESTRICT',
})
SucursalArticuloVariant.belongsTo(ArticuloVariant, {
    foreignKey: 'articulo_variant',
    as: 'articulo_variant1',
})

Sucursal.hasMany(SucursalArticuloVariant, {
    foreignKey: 'sucursal',
    as: 'sucursal_articulo_variants',
    onDelete: 'RESTRICT',
})
SucursalArticuloVariant.belongsTo(Sucursal, { foreignKey: 'sucursal', as: 'sucursal1' })

Empresa.hasMany(SucursalArticuloVariant, {
    foreignKey: 'empresa',
    as: 'sucursal_articulo_variants',
    onDelete: 'RESTRICT',
})
SucursalArticuloVariant.belongsTo(Empresa, { foreignKey: 'empresa', as: 'empresa1' })

Colaborador.hasMany(SucursalArticuloVariant, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
SucursalArticuloVariant.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(SucursalArticuloVariant, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
SucursalArticuloVariant.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })
