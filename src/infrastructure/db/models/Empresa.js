import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
// import { Colaborador } from './Colaborador.js'

export const Empresa = sequelize.define('empresas', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tipo: { type: DataTypes.SMALLINT },
    ruc: { type: DataTypes.STRING },
    razon_social: { type: DataTypes.STRING },
    nombre_comercial: { type: DataTypes.STRING },

    domicilio_fiscal: { type: DataTypes.STRING },
    ubigeo: { type: DataTypes.STRING },
    igv_porcentaje: { type: DataTypes.FLOAT, defaultValue: 18 },

    telefono: { type: DataTypes.STRING },
    correo: { type: DataTypes.STRING },
    foto: { type: DataTypes.JSON, defaultValue: {} },

    comprobante_tipos: { type: DataTypes.JSON },
    subdominio: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING },

    logo: { type: DataTypes.STRING }, //QUITAR
    logo_url: { type: DataTypes.STRING }, //QUITAR
    distrito: { type: DataTypes.STRING }, //QUITAR
    provincia: { type: DataTypes.STRING }, //QUITAR
    departamento: { type: DataTypes.STRING }, //QUITAR
    sol_usuario: { type: DataTypes.STRING }, //quitar
    sol_clave: { type: DataTypes.STRING }, //quitar
    cdt_clave: { type: DataTypes.STRING }, //quitar
    cdt: { type: DataTypes.STRING }, //quitar
    pc_principal_ip: { type: DataTypes.STRING }, //quitar
    pc_principal_colaborador: { type: DataTypes.STRING }, //quitar
})
