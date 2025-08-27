import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Colaborador } from './Colaborador.js'

export const Moneda = sequelize.define('monedas', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nombre: { type: DataTypes.STRING }, //required
    codigo: { type: DataTypes.STRING }, //required
    simbolo: { type: DataTypes.STRING }, //required
    plural: { type: DataTypes.STRING }, //required
    estandar: { type: DataTypes.BOOLEAN }, //required

    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

Colaborador.hasMany(Moneda, {foreignKey:'createdBy', onDelete:'RESTRICT'})
Moneda.belongsTo(Colaborador, {foreignKey:'createdBy', as:'createdBy1'})
Colaborador.hasMany(Moneda, {foreignKey:'updatedBy', onDelete:'RESTRICT'})
Moneda.belongsTo(Colaborador, {foreignKey:'updatedBy', as:'updatedBy1'})