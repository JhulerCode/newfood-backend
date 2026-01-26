import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'
import { Socio } from './Socio.js'
import { Articulo } from './Articulo.js'
import { Colaborador } from './Colaborador.js'
import { ComprobanteTipo } from './ComprobanteTipo.js'
import { PagoMetodo } from './PagoMetodo.js'
import { Mesa } from './Mesa.js'
import { Salon } from './Salon.js'
import { Sucursal } from './Sucursal.js'
import { Empresa } from './Empresa.js'
import { CajaApertura } from './CajaApertura.js'

export const Transaccion = sequelize.define('transacciones', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tipo: { type: DataTypes.SMALLINT },
    fecha: { type: DataTypes.DATEONLY },
    socio: { type: DataTypes.STRING },

    pago_condicion: { type: DataTypes.STRING },
    monto: { type: DataTypes.DECIMAL(10, 2) },

    observacion: { type: DataTypes.STRING },
    estado: { type: DataTypes.STRING },
    anulado_motivo: { type: DataTypes.STRING },

    compra_comprobante: { type: DataTypes.STRING },
    compra_comprobante_serie: { type: DataTypes.STRING },
    compra_comprobante_correlativo: { type: DataTypes.STRING },

    venta_codigo: { type: DataTypes.STRING },
    venta_canal: { type: DataTypes.STRING },
    venta_mesa: { type: DataTypes.STRING },
    venta_pago_metodo: { type: DataTypes.STRING },
    venta_pago_con: { type: DataTypes.DECIMAL(10, 2) },
    venta_socio_datos: { type: DataTypes.JSON },
    venta_facturado: { type: DataTypes.BOOLEAN, defaultValue: false },
    venta_entregado: { type: DataTypes.BOOLEAN, defaultValue: false },

    caja_apertura: { type: DataTypes.STRING },
    sucursal: { type: DataTypes.STRING },
    empresa: { type: DataTypes.STRING },
    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
})

Socio.hasMany(Transaccion, { foreignKey: 'socio', as: 'transacciones', onDelete: 'RESTRICT' })
Transaccion.belongsTo(Socio, { foreignKey: 'socio', as: 'socio1' })

Salon.hasMany(Transaccion, { foreignKey: 'venta_salon', as: 'transacciones', onDelete: 'RESTRICT' })
Transaccion.belongsTo(Salon, { foreignKey: 'venta_salon', as: 'venta_salon1' })

Mesa.hasMany(Transaccion, { foreignKey: 'venta_mesa', as: 'transacciones', onDelete: 'RESTRICT' })
Transaccion.belongsTo(Mesa, { foreignKey: 'venta_mesa', as: 'venta_mesa1' })

PagoMetodo.hasMany(Transaccion, { foreignKey: 'venta_pago_metodo', as: 'transacciones', onDelete: 'RESTRICT' })
Transaccion.belongsTo(PagoMetodo, { foreignKey: 'venta_pago_metodo', as: 'venta_pago_metodo1' })

CajaApertura.hasMany(Transaccion, { foreignKey: 'caja_apertura', as: 'transacciones', onDelete: 'RESTRICT' })
Transaccion.belongsTo(CajaApertura, { foreignKey: 'caja_apertura', as: 'caja_apertura1' })

Sucursal.hasMany(Transaccion, { foreignKey: 'sucursal', as: 'transacciones', onDelete: 'RESTRICT' })
Transaccion.belongsTo(Sucursal, { foreignKey: 'sucursal', as: 'sucursal1' })

Empresa.hasMany(Transaccion, { foreignKey: 'empresa', as: 'transacciones', onDelete: 'RESTRICT' })
Transaccion.belongsTo(Empresa, { foreignKey: 'empresa', as: 'empresa1' })

Colaborador.hasMany(Transaccion, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
Transaccion.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(Transaccion, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
Transaccion.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })



export const TransaccionItem = sequelize.define('transaccion_items', {
    id: { type: DataTypes.STRING, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    articulo: { type: DataTypes.STRING },
    cantidad: { type: DataTypes.DECIMAL(10, 2) },

    pu: { type: DataTypes.DOUBLE },
    igv_afectacion: { type: DataTypes.STRING },
    igv_porcentaje: { type: DataTypes.DOUBLE },

    observacion: { type: DataTypes.STRING },
    has_receta: { type: DataTypes.BOOLEAN },
    receta_insumos: { type: DataTypes.JSON },
    is_combo: { type: DataTypes.BOOLEAN },
    combo_articulos: { type: DataTypes.JSON },
    venta_entregado: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },

    transaccion: { type: DataTypes.STRING },
    sucursal: { type: DataTypes.STRING },
    empresa: { type: DataTypes.STRING },
    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING },

    descuento_tipo: { type: DataTypes.STRING }, //eliminar
    descuento_valor: { type: DataTypes.DOUBLE }, //eliminar
})

Articulo.hasMany(TransaccionItem, { foreignKey: 'articulo', as: 'transaccion_items', onDelete: 'RESTRICT' })
TransaccionItem.belongsTo(Articulo, { foreignKey: 'articulo', as: 'articulo1' })

Transaccion.hasMany(TransaccionItem, { foreignKey: 'transaccion', as: 'transaccion_items', onDelete: 'RESTRICT' })
TransaccionItem.belongsTo(Transaccion, { foreignKey: 'transaccion', as: 'transaccion1' })

Sucursal.hasMany(TransaccionItem, { foreignKey: 'sucursal', as: 'transaccion_items', onDelete: 'RESTRICT' })
TransaccionItem.belongsTo(Sucursal, { foreignKey: 'sucursal', as: 'sucursal1' })

Empresa.hasMany(TransaccionItem, { foreignKey: 'empresa', as: 'transaccion_items', onDelete: 'RESTRICT' })
TransaccionItem.belongsTo(Empresa, { foreignKey: 'empresa', as: 'empresa1' })

Colaborador.hasMany(TransaccionItem, { foreignKey: 'createdBy', onDelete: 'RESTRICT' })
TransaccionItem.belongsTo(Colaborador, { foreignKey: 'createdBy', as: 'createdBy1' })
Colaborador.hasMany(TransaccionItem, { foreignKey: 'updatedBy', onDelete: 'RESTRICT' })
TransaccionItem.belongsTo(Colaborador, { foreignKey: 'updatedBy', as: 'updatedBy1' })