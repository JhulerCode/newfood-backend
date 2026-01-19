import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Empresa } from './Empresa.js'
import { Colaborador } from './Colaborador.js'

export const PagoMetodo = sequelize.define('pago_metodos', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nombre: { type: DataTypes.STRING },
    color: { type: DataTypes.STRING },
    activo: { type: DataTypes.BOOLEAN },

    empresa: { type: DataTypes.STRING },
    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

Empresa.hasMany(PagoMetodo, { foreignKey: 'empresa', as: 'pago_metodos', onDelete: 'RESTRICT' })
PagoMetodo.belongsTo(Empresa, { foreignKey: 'empresa', as: 'empresa1' })

Colaborador.hasMany(PagoMetodo, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
PagoMetodo.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(PagoMetodo, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
PagoMetodo.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })