import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Colaborador } from './Colaborador.js'

export const Caja = sequelize.define('cajas', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nombre: { type: DataTypes.STRING }, //required
    impresora: { type: DataTypes.STRING }, //required
    activo: { type: DataTypes.BOOLEAN }, //required

    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

Colaborador.hasMany(Caja, {foreignKey:'createdBy', onDelete:'RESTRICT'})
Caja.belongsTo(Colaborador, {foreignKey:'createdBy', as:'createdBy1'})
Colaborador.hasMany(Caja, {foreignKey:'updatedBy', onDelete:'RESTRICT'})
Caja.belongsTo(Colaborador, {foreignKey:'updatedBy', as:'updatedBy1'})