import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { ArticuloCategoria } from './ArticuloCategoria.js'
import { Colaborador } from './Colaborador.js'
import { ProduccionArea } from './ProduccionArea.js'

export const Articulo = sequelize.define('articulos', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    codigo_barra: { type: DataTypes.STRING },
    nombre: { type: DataTypes.STRING }, //required
    unidad: { type: DataTypes.STRING }, //required
    marca: { type: DataTypes.STRING },
    activo: { type: DataTypes.BOOLEAN }, //required

    igv_afectacion: { type: DataTypes.STRING }, //required

    tipo: { type: DataTypes.STRING }, //required
    categoria: { type: DataTypes.STRING }, //required //linked
    
    produccion_area: { type: DataTypes.STRING },
    has_receta: { type: DataTypes.BOOLEAN },

    is_combo: { type: DataTypes.BOOLEAN },
    combo_articulos: { type: DataTypes.JSON },

    precio_venta: { type: DataTypes.DOUBLE },
    stock: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },

    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

ArticuloCategoria.hasMany(Articulo, { foreignKey: 'categoria', as: 'articulos', onDelete: 'RESTRICT' })
Articulo.belongsTo(ArticuloCategoria, { foreignKey: 'categoria', as: 'categoria1' })

ProduccionArea.hasMany(Articulo, { foreignKey: 'produccion_area', as: 'articulos', onDelete: 'RESTRICT' })
Articulo.belongsTo(ProduccionArea, { foreignKey: 'produccion_area', as: 'produccion_area1' })

Colaborador.hasMany(Articulo, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
Articulo.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(Articulo, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
Articulo.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })