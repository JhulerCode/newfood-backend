import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Colaborador } from './Colaborador.js'
import { Salon } from './Salon.js'

export const Mesa = sequelize.define('mesas', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nombre: { type: DataTypes.STRING }, //required
    activo: { type: DataTypes.BOOLEAN }, //required
    salon: { type: DataTypes.STRING },

    unida: { type: DataTypes.BOOLEAN, defaultValue: false },
    unidos: { type: DataTypes.JSON, defaultValue: [] },

    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

Salon.hasMany(Mesa, { foreignKey: 'salon', as: 'mesas', onDelete: 'RESTRICT' })
Mesa.belongsTo(Salon, { foreignKey: 'salon', as: 'salon1' })

Colaborador.hasMany(Mesa, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
Mesa.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(Mesa, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
Mesa.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })