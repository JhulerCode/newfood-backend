import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
// import { Caja } from '../locales/Caja.js'

export const CajaApertura = sequelize.define('caja_aperturas', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    fecha_apertura: { type: DataTypes.DATE },
    fecha_cierre: { type: DataTypes.DATE },
    monto_apertura: { type: DataTypes.DECIMAL(10, 2) },
    monto_cierre: { type: DataTypes.DECIMAL(10, 2) },
    abierto: { type: DataTypes.BOOLEAN },

    // caja: {type:DataTypes.STRING}, //linked

    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

// Caja.hasMany(CajaApertura, {foreignKey:'caja', as:'caja_aperturas', onDelete:'RESTRICT'})
// CajaApertura.belongsTo(Caja, {foreignKey:'caja', as:'caja1'})