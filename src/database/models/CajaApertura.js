import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Colaborador } from './Colaborador.js'

export const CajaApertura = sequelize.define('caja_aperturas', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    fecha_apertura: { type: DataTypes.DATE },
    fecha_cierre: { type: DataTypes.DATE },
    monto_apertura: { type: DataTypes.DECIMAL(10, 2) },
    monto_cierre: { type: DataTypes.DECIMAL(10, 2) },
    estado: { type: DataTypes.STRING },

    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

Colaborador.hasMany(CajaApertura, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
CajaApertura.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(CajaApertura, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
CajaApertura.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })