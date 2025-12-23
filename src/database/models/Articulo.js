import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { ArticuloCategoria } from './ArticuloCategoria.js'
import { ProduccionArea } from './ProduccionArea.js'
import { Empresa } from './Empresa.js'
import { Colaborador } from './Colaborador.js'

const precios_semana_default = [
    { id: 0, dia: 'DOMINGO', pu: null },
    { id: 1, dia: 'LUNES', pu: null },
    { id: 2, dia: 'MARTES', pu: null },
    { id: 3, dia: 'MIÉRCOLES', pu: null },
    { id: 4, dia: 'JUEVES', pu: null },
    { id: 5, dia: 'VIERNES', pu: null },
    { id: 6, dia: 'SÁBADO', pu: null }
]

export const Articulo = sequelize.define('articulos', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    codigo_barra: { type: DataTypes.STRING },
    nombre: { type: DataTypes.STRING },
    unidad: { type: DataTypes.STRING },
    marca: { type: DataTypes.STRING },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true },
    foto_path: { type: DataTypes.STRING },
    foto_url: { type: DataTypes.STRING },

    tipo: { type: DataTypes.STRING },
    categoria: { type: DataTypes.STRING },

    produccion_area: { type: DataTypes.STRING },
    has_receta: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_combo: { type: DataTypes.BOOLEAN, defaultValue: false },

    igv_afectacion: { type: DataTypes.STRING },
    precio_venta: { type: DataTypes.DOUBLE },
    precios_semana: { type: DataTypes.JSON, defaultValue: precios_semana_default },
    stock: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },

    empresa: { type: DataTypes.STRING },
    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING },
})

ArticuloCategoria.hasMany(Articulo, { foreignKey: 'categoria', as: 'articulos', onDelete: 'RESTRICT' })
Articulo.belongsTo(ArticuloCategoria, { foreignKey: 'categoria', as: 'categoria1' })

ProduccionArea.hasMany(Articulo, { foreignKey: 'produccion_area', as: 'articulos', onDelete: 'RESTRICT' })
Articulo.belongsTo(ProduccionArea, { foreignKey: 'produccion_area', as: 'produccion_area1' })

Empresa.hasMany(Articulo, { foreignKey: 'empresa', as: 'articulos', onDelete: 'RESTRICT' })
Articulo.belongsTo(Empresa, { foreignKey: 'empresa', as: 'empresa1' })

Colaborador.hasMany(Articulo, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
Articulo.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(Articulo, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
Articulo.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })