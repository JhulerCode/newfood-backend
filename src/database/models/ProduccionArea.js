import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Colaborador } from './Colaborador.js'

export const ProduccionArea = sequelize.define('produccion_areas', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nombre: { type: DataTypes.STRING },
    impresora_tipo: { type: DataTypes.STRING },
    impresora: { type: DataTypes.STRING },
    activo: { type: DataTypes.BOOLEAN },

    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

Colaborador.hasMany(ProduccionArea, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
ProduccionArea.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(ProduccionArea, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
ProduccionArea.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })