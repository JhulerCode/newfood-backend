import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Colaborador } from './Colaborador.js'

export const PagoComprobante = sequelize.define('pago_comprobantes', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nombre: { type: DataTypes.STRING },
    serie: { type: DataTypes.STRING },
    numero: { type: DataTypes.INTEGER },
    correlativo: { type: DataTypes.INTEGER },
    activo: { type: DataTypes.BOOLEAN, defaultValue: false },
    estandar: { type: DataTypes.BOOLEAN, defaultValue: false },

    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

Colaborador.hasMany(PagoComprobante, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
PagoComprobante.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(PagoComprobante, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
PagoComprobante.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })