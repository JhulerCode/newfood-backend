import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Colaborador } from './Colaborador.js'

export const PagoMetodo = sequelize.define('pago_metodos', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nombre: { type: DataTypes.STRING }, //required
    color: { type: DataTypes.STRING }, //required
    activo: { type: DataTypes.BOOLEAN }, //required

    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

Colaborador.hasMany(PagoMetodo, {foreignKey:'createdBy', onDelete:'RESTRICT'})
PagoMetodo.belongsTo(Colaborador, {foreignKey:'createdBy', as:'createdBy1'})
Colaborador.hasMany(PagoMetodo, {foreignKey:'updatedBy', onDelete:'RESTRICT'})
PagoMetodo.belongsTo(Colaborador, {foreignKey:'updatedBy', as:'updatedBy1'})