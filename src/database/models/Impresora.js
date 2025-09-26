import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Empresa } from './Empresa.js'
import { Colaborador } from './Colaborador.js'

export const Impresora = sequelize.define('impresoras', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nombre: { type: DataTypes.STRING },
    activo: { type: DataTypes.BOOLEAN },

    empresa: { type: DataTypes.STRING },
    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

Empresa.hasMany(Impresora, { foreignKey: 'empresa', as: 'impresoras', onDelete: 'RESTRICT' })
Impresora.belongsTo(Empresa, { foreignKey: 'empresa', as: 'empresa1' })

Colaborador.hasMany(Impresora, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
Impresora.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(Impresora, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
Impresora.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })