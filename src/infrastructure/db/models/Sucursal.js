import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Empresa } from './Empresa.js'
import { Colaborador } from './Colaborador.js'

export const Salon = sequelize.define('salones', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nombre: { type: DataTypes.STRING },
    direccion: { type: DataTypes.STRING },
    activo: { type: DataTypes.BOOLEAN },

    empresa: { type: DataTypes.STRING },
    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

Empresa.hasMany(Salon, { foreignKey: 'empresa', as: 'salones', onDelete: 'RESTRICT' })
Salon.belongsTo(Empresa, { foreignKey: 'empresa', as: 'empresa1' })

Colaborador.hasMany(Salon, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
Salon.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(Salon, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
Salon.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })