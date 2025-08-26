import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { ArticuloCategoria } from './ArticuloCategoria.js'
import { Colaborador } from './Colaborador.js'

export const Articulo = sequelize.define('articulos', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    codigo_barra: { type: DataTypes.STRING },
    nombre: { type: DataTypes.STRING }, //required
    unidad: { type: DataTypes.STRING }, //required
    marca: { type: DataTypes.STRING },

    // vende: { type: DataTypes.BOOLEAN }, //required
    // has_fv: { type: DataTypes.BOOLEAN }, //required
    activo: { type: DataTypes.BOOLEAN }, //required

    igv_afectacion: { type: DataTypes.STRING }, //required

    tipo: { type: DataTypes.STRING }, //required
    categoria: { type: DataTypes.STRING }, //required //linked
    // produccion_tipo: { type: DataTypes.STRING },
    // filtrantes: { type: DataTypes.INTEGER },
    // contenido_neto: { type: DataTypes.DOUBLE },
    is_combo: { type: DataTypes.BOOLEAN },
    combo_articulos: { type: DataTypes.JSON },

    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

ArticuloCategoria.hasMany(Articulo, { foreignKey: 'categoria', as: 'articulos', onDelete: 'RESTRICT' })
Articulo.belongsTo(ArticuloCategoria, { foreignKey: 'categoria', as: 'categoria1' })

Colaborador.hasMany(Articulo, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
Articulo.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(Articulo, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
Articulo.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })