import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Colaborador } from './Colaborador.js'

export const Socio = sequelize.define('socios', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tipo: { type: DataTypes.SMALLINT }, //required

    doc_tipo: { type: DataTypes.STRING }, //required
    doc_numero: { type: DataTypes.STRING }, //required
    nombres: { type: DataTypes.STRING }, //required

    telefono: { type: DataTypes.STRING },
    correo: { type: DataTypes.STRING },
    direccion: { type: DataTypes.STRING },
    referencia: { type: DataTypes.STRING },

    activo: { type: DataTypes.BOOLEAN }, //required

    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING },

    nombres_apellidos: {
        type: DataTypes.VIRTUAL,
        get() {
            const nombres = this.nombres || ''
            const apellidos = this.apellidos || ''
            return `${nombres} ${apellidos}`.trim()
        }
    }
})

Colaborador.hasMany(Socio, {foreignKey:'createdBy', onDelete:'RESTRICT'})
Socio.belongsTo(Colaborador, {foreignKey:'createdBy', as:'createdBy1'})
Colaborador.hasMany(Socio, {foreignKey:'updatedBy', onDelete:'RESTRICT'})
Socio.belongsTo(Colaborador, {foreignKey:'updatedBy', as:'updatedBy1'})