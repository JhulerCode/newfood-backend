import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Sucursal } from './Sucursal.js'
import { Empresa } from './Empresa.js'
import { Colaborador } from './Colaborador.js'

export const ImpresionArea = sequelize.define('produccion_areas', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nombre: { type: DataTypes.STRING },
    impresora_tipo: { type: DataTypes.STRING },
    impresora: { type: DataTypes.STRING },
    activo: { type: DataTypes.BOOLEAN },

    sucursal: { type: DataTypes.STRING },
    empresa: { type: DataTypes.STRING },
    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

Sucursal.hasMany(ImpresionArea, { foreignKey: 'sucursal', as: 'produccion_areas', onDelete: 'RESTRICT' })
ImpresionArea.belongsTo(Sucursal, { foreignKey: 'sucursal', as: 'sucursal1' })

Empresa.hasMany(ImpresionArea, { foreignKey: 'empresa', as: 'produccion_areas', onDelete: 'RESTRICT' })
ImpresionArea.belongsTo(Empresa, { foreignKey: 'empresa', as: 'empresa1' })

Colaborador.hasMany(ImpresionArea, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
ImpresionArea.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(ImpresionArea, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
ImpresionArea.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })