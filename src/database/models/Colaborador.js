import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'

export const Colaborador = sequelize.define('colaboradores', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nombres: { type: DataTypes.STRING }, //required
    apellidos: { type: DataTypes.STRING }, //required

    doc_tipo: { type: DataTypes.STRING }, //required
    doc_numero: { type: DataTypes.STRING }, //required

    fecha_nacimiento: { type: DataTypes.DATE },
    sexo: { type: DataTypes.STRING },

    correo: { type: DataTypes.STRING },
    telefono: { type: DataTypes.STRING },
    ubigeo: { type: DataTypes.STRING }, //required
    direccion: { type: DataTypes.STRING },

    cargo: { type: DataTypes.STRING }, //required
    sueldo: { type: DataTypes.DOUBLE },
    activo: { type: DataTypes.BOOLEAN },

    has_signin: { type: DataTypes.BOOLEAN }, //required
    usuario: { type: DataTypes.STRING }, //required
    contrasena: { type: DataTypes.STRING }, //required
    lastSignin: { type: DataTypes.DATE },
    lastUpdatePassword: { type: DataTypes.DATE },
    permisos: { type: DataTypes.JSON }, //required
    vista_inicial: { type: DataTypes.STRING },

    theme: { type: DataTypes.STRING, defaultValue: '1' },
    color: { type: DataTypes.STRING, defaultValue: '#2492c2' },
    format_date: { type: DataTypes.STRING, defaultValue: 'DD-MM-YYYY' },
    menu_visible: { type: DataTypes.BOOLEAN, defaultValue: true },

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

Colaborador.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1', onDelete: 'RESTRICT' })
Colaborador.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1', onDelete: 'RESTRICT' })