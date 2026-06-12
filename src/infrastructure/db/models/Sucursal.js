import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Empresa } from './Empresa.js'
import { Colaborador } from './Colaborador.js'

export const Sucursal = sequelize.define('sucursales', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    codigo: { type: DataTypes.STRING },

    direccion: { type: DataTypes.STRING },
    telefono: { type: DataTypes.STRING },
    correo: { type: DataTypes.STRING },

    activo: { type: DataTypes.BOOLEAN },
    printer_token_hash: { type: DataTypes.STRING },
    printer_agent_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    printer_status: { type: DataTypes.STRING, defaultValue: 'offline' },
    printer_app_version: { type: DataTypes.STRING },
    printer_last_seen_at: { type: DataTypes.DATE },

    empresa: { type: DataTypes.STRING },
    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

Empresa.hasMany(Sucursal, { foreignKey: 'empresa', as: 'sucursales', onDelete: 'RESTRICT' })
Sucursal.belongsTo(Empresa, { foreignKey: 'empresa', as: 'empresa1' })

Colaborador.hasMany(Sucursal, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
Sucursal.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(Sucursal, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
Sucursal.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })
