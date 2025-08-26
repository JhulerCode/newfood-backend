// Estructura Sequelize para una base de datos de restaurante
// Cada archivo es un modelo individual con campos clave y relaciones definidas

// === MODELO: cliente.js ===
import { DataTypes } from 'sequelize'
import sequelize from '../sequelize.js'

export const Cliente = sequelize.define('clientes', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nombre: { type: DataTypes.STRING },
  documento: { type: DataTypes.STRING },
  telefono: { type: DataTypes.STRING },
  correo: { type: DataTypes.STRING },
  direccion: { type: DataTypes.STRING },

  createdBy: { type: DataTypes.STRING },
  updatedBy: { type: DataTypes.STRING }
})

// === MODELO: proveedor.js ===
export const Proveedor = sequelize.define('proveedores', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nombre: { type: DataTypes.STRING },
  ruc: { type: DataTypes.STRING },
  telefono: { type: DataTypes.STRING },
  correo: { type: DataTypes.STRING },
  direccion: { type: DataTypes.STRING },

  createdBy: { type: DataTypes.STRING },
  updatedBy: { type: DataTypes.STRING }
})

// === MODELO: metodo_pago.js ===
export const MetodoPago = sequelize.define('metodos_pago', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nombre: { type: DataTypes.STRING },

  createdBy: { type: DataTypes.STRING },
  updatedBy: { type: DataTypes.STRING }
})

// === MODELO: articulo_categoria.js ===
export const ArticuloCategoria = sequelize.define('articulo_categorias', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tipo: { type: DataTypes.STRING }, // 'producto' o 'insumo'
  nombre: { type: DataTypes.STRING },
  descripcion: { type: DataTypes.STRING },
  activo: { type: DataTypes.BOOLEAN },

  createdBy: { type: DataTypes.STRING },
  updatedBy: { type: DataTypes.STRING }
})

// === MODELO: producto.js ===
export const Producto = sequelize.define('productos', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nombre: { type: DataTypes.STRING },
  categoria_id: { type: DataTypes.UUID },
  presentacion: { type: DataTypes.STRING },
  precio_venta: { type: DataTypes.DECIMAL },
  activo: { type: DataTypes.BOOLEAN },

  createdBy: { type: DataTypes.STRING },
  updatedBy: { type: DataTypes.STRING }
})

// === MODELO: insumo.js ===
export const Insumo = sequelize.define('insumos', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nombre: { type: DataTypes.STRING },
  categoria_id: { type: DataTypes.UUID },
  unidad: { type: DataTypes.STRING },
  activo: { type: DataTypes.BOOLEAN },

  createdBy: { type: DataTypes.STRING },
  updatedBy: { type: DataTypes.STRING }
})

// === MODELO: receta.js ===
export const Receta = sequelize.define('recetas', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  producto_id: { type: DataTypes.UUID },
  area_produccion_id: { type: DataTypes.UUID },

  createdBy: { type: DataTypes.STRING },
  updatedBy: { type: DataTypes.STRING }
})

// === MODELO: receta_detalle.js ===
export const RecetaDetalle = sequelize.define('receta_detalle', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  receta_id: { type: DataTypes.UUID },
  insumo_id: { type: DataTypes.UUID },
  cantidad: { type: DataTypes.DECIMAL },

  createdBy: { type: DataTypes.STRING },
  updatedBy: { type: DataTypes.STRING }
})

// === MODELO: compras.js ===
export const Compra = sequelize.define('compras', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  proveedor_id: { type: DataTypes.UUID },
  usuario_id: { type: DataTypes.UUID },
  fecha: { type: DataTypes.DATE },
  total: { type: DataTypes.DECIMAL },
  metodo_pago_id: { type: DataTypes.UUID },
  observacion: { type: DataTypes.STRING }
})

// === MODELO: compra_detalle.js ===
export const CompraDetalle = sequelize.define('compra_detalle', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  compra_id: { type: DataTypes.UUID },
  insumo_id: { type: DataTypes.UUID },
  cantidad: { type: DataTypes.DECIMAL },
  precio_unitario: { type: DataTypes.DECIMAL },
  subtotal: { type: DataTypes.DECIMAL }
})

// === MODELO: ventas.js ===
export const Venta = sequelize.define('ventas', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  cliente_id: { type: DataTypes.UUID },
  usuario_id: { type: DataTypes.UUID },
  fecha: { type: DataTypes.DATE },
  total: { type: DataTypes.DECIMAL },
  metodo_pago_id: { type: DataTypes.UUID },
  caja_id: { type: DataTypes.UUID },
  estado: { type: DataTypes.STRING },
  observacion: { type: DataTypes.STRING }
})

// === MODELO: venta_detalle.js ===
export const VentaDetalle = sequelize.define('venta_detalle', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  venta_id: { type: DataTypes.UUID },
  producto_id: { type: DataTypes.UUID },
  cantidad: { type: DataTypes.DECIMAL },
  precio_unitario: { type: DataTypes.DECIMAL },
  subtotal: { type: DataTypes.DECIMAL }
})

// === MODELO: kardex.js ===
export const Kardex = sequelize.define('kardex', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tipo_movimiento: { type: DataTypes.STRING }, // 'entrada', 'salida'
  origen: { type: DataTypes.STRING }, // 'venta', 'compra', 'ajuste'
  id_origen: { type: DataTypes.UUID },
  item_id: { type: DataTypes.UUID },
  tipo_item: { type: DataTypes.STRING }, // 'insumo', 'producto'
  cantidad: { type: DataTypes.DECIMAL },
  precio_unitario: { type: DataTypes.DECIMAL },
  fecha: { type: DataTypes.DATE },
  observacion: { type: DataTypes.STRING }
})
