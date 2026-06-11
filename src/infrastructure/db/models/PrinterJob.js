import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Empresa } from './Empresa.js'
import { Sucursal } from './Sucursal.js'

export const PrinterJob = sequelize.define('printer_jobs', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    type: { type: DataTypes.STRING },
    source_event: { type: DataTypes.STRING },
    payload: { type: DataTypes.JSONB, defaultValue: {} },
    colaborador: { type: DataTypes.JSONB, defaultValue: {} },
    printer_area: { type: DataTypes.STRING },
    printer_name: { type: DataTypes.STRING },
    engine: { type: DataTypes.STRING, defaultValue: 'sumatra-pdf' },
    status: { type: DataTypes.STRING, defaultValue: 'pending' },
    attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
    error_message: { type: DataTypes.TEXT },
    received_at: { type: DataTypes.DATE },
    printed_at: { type: DataTypes.DATE },
    failed_at: { type: DataTypes.DATE },

    sucursal: { type: DataTypes.STRING },
    empresa: { type: DataTypes.STRING },
})

Empresa.hasMany(PrinterJob, { foreignKey: 'empresa', as: 'printer_jobs', onDelete: 'RESTRICT' })
PrinterJob.belongsTo(Empresa, { foreignKey: 'empresa', as: 'empresa1' })

Sucursal.hasMany(PrinterJob, { foreignKey: 'sucursal', as: 'printer_jobs', onDelete: 'RESTRICT' })
PrinterJob.belongsTo(Sucursal, { foreignKey: 'sucursal', as: 'sucursal1' })
