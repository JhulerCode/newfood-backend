import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Empresa } from './Empresa.js'
import { Colaborador } from './Colaborador.js'

export const ComprobanteTipo = sequelize.define('pago_comprobantes', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tipo: { type: DataTypes.STRING },
    serie: { type: DataTypes.STRING },
    numero: { type: DataTypes.INTEGER },
    correlativo: { type: DataTypes.INTEGER },
    activo: { type: DataTypes.BOOLEAN, defaultValue: false },
    estandar: { type: DataTypes.BOOLEAN, defaultValue: false },

    empresa: { type: DataTypes.STRING },
    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING },

    nombre: { type: DataTypes.STRING }, //eliminar
})

Empresa.hasMany(ComprobanteTipo, { foreignKey: 'empresa', as: 'pago_comprobantes', onDelete: 'RESTRICT' })
ComprobanteTipo.belongsTo(Empresa, { foreignKey: 'empresa', as: 'empresa1' })

Colaborador.hasMany(ComprobanteTipo, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
ComprobanteTipo.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(ComprobanteTipo, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
ComprobanteTipo.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })