import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Colaborador } from './Colaborador.js'

export const Salon = sequelize.define('salones', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nombre: { type: DataTypes.STRING },
    activo: { type: DataTypes.BOOLEAN },

    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

Colaborador.hasMany(Salon, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
Salon.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(Salon, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
Salon.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })