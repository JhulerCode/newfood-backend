import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Articulo } from './Articulo.js'
import { Transaccion } from './Transaccion.js'
import { Colaborador } from './Colaborador.js'

export const Kardex = sequelize.define('kardexes', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tipo: { type: DataTypes.SMALLINT }, //required
    fecha: { type: DataTypes.DATEONLY }, //required

    articulo: { type: DataTypes.STRING }, //required //linked
    cantidad: { type: DataTypes.DECIMAL(10, 2) }, //required

    estado: { type: DataTypes.STRING },

    transaccion: { type: DataTypes.STRING }, //required //linked

    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

Articulo.hasMany(Kardex, { foreignKey: 'articulo', as: 'kardexes', onDelete: 'RESTRICT' })
Kardex.belongsTo(Articulo, { foreignKey: 'articulo', as: 'articulo1' })

Transaccion.hasMany(Kardex, { foreignKey: 'transaccion', as: 'kardexes', onDelete: 'RESTRICT' })
Kardex.belongsTo(Transaccion, { foreignKey: 'transaccion', as: 'transaccion1' })

Colaborador.hasMany(Kardex, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
Kardex.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(Kardex, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
Kardex.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })