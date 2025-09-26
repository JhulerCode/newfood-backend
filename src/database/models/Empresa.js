import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
// import { Colaborador } from './Colaborador.js'

export const Empresa = sequelize.define('empresas', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    ruc: { type: DataTypes.STRING },
    razon_social: { type: DataTypes.STRING },
    nombre_comercial: { type: DataTypes.STRING },
    
    domicilio_fiscal: { type: DataTypes.STRING },
    ubigeo: { type: DataTypes.STRING },
    distrito: { type: DataTypes.STRING },
    provincia: { type: DataTypes.STRING },
    departamento: { type: DataTypes.STRING },

    telefono: { type: DataTypes.STRING },
    correo: { type: DataTypes.STRING },
    logo: { type: DataTypes.STRING },

    igv_porcentaje: { type: DataTypes.FLOAT, defaultValue: 18 },
    sol_usuario: { type: DataTypes.STRING },
    sol_clave: { type: DataTypes.STRING },
    cdt_clave: { type: DataTypes.STRING },
    cdt: { type: DataTypes.STRING },

    pc_principal_ip: { type: DataTypes.STRING },

    updatedBy: { type: DataTypes.STRING }
})

// Colaborador.hasMany(Empresa, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
// Empresa.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })