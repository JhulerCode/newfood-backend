import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Colaborador } from './Colaborador.js'

export const Empresa = sequelize.define('empresas', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    ruc: { type: DataTypes.STRING }, //required
    nombre: { type: DataTypes.STRING }, //required

    telefono: { type: DataTypes.STRING }, //required
    correo: { type: DataTypes.STRING }, //required
    direccion: { type: DataTypes.STRING }, //required
    
    pc_principal_ip: { type: DataTypes.STRING }, //required
    igv_porcentaje: { type: DataTypes.FLOAT, defaultValue: 18 }, //required

    updatedBy: { type: DataTypes.STRING }
})

Colaborador.hasMany(Empresa, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
Empresa.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })