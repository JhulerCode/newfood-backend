import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Empresa } from './Empresa.js'
import { Colaborador } from './Colaborador.js'

export const ProduccionArea = sequelize.define('produccion_areas', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nombre: { type: DataTypes.STRING },
    impresora_tipo: { type: DataTypes.STRING },
    impresora: { type: DataTypes.STRING },
    activo: { type: DataTypes.BOOLEAN },

    empresa: { type: DataTypes.STRING },
    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

Empresa.hasMany(ProduccionArea, { foreignKey: 'empresa', as: 'produccion_areas', onDelete: 'RESTRICT' })
ProduccionArea.belongsTo(Empresa, { foreignKey: 'empresa', as: 'empresa1' })

Colaborador.hasMany(ProduccionArea, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
ProduccionArea.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(ProduccionArea, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
ProduccionArea.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })