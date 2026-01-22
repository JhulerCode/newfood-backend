import { Router } from 'express'

import verifyVersion from '#http/middlewares/verifyVersion.js'
import verifyToken from '#http/middlewares/verifyToken.js'

import auth from '#core/_auth/rAuth.js'
import sistema from '#core/_sistema/rSistema.js'

import decolecta from '#core/decolecta/rDecolecta.js'

import articulo_categorias from '#core/articulo_categorias/rArticuloCategorias.js'
import articulos from '#core/articulos/rArticulos.js'
import caja_aperturas from '#core/caja_aperturas/rCajaAperturas.js'
import colaboradores from '#core/colaboradores/rColaboradores.js'
import comprobante_items from '#core/comprobante_items/rComprobanteItems.js'
import comprobantes from '#core/comprobantes/rComprobantes.js'
import combo_articulos from '#core/combo_articulos/rComboArticulo.js'
import empresa from '#core/empresas/rEmpresa.js'
import dinero_movimientos from '#core/dinero_movimientos/rDineroMovimientos.js'
import kardex from '#core/kardex/rKardex.js'
import mesas from '#core/mesas/rMesas.js'
import comprobante_tipos from '#core/comprobante_tipos/rComprobanteTipos.js'
import pago_metodos from '#core/pago_metodos/rPagoMetodos.js'
import produccion_areas from '#core/produccion_areas/rProduccionAreas.js'
import receta_insumos from '#core/receta_insumos/rRecetaInsumos.js'
import salones from '#core/salones/rSalones.js'
import socios from '#core/socios/rSocios.js'
import sucursales from '#core/sucursales/rSucursales.js'
import sucursal_comprobante_tipos from '#core/sucursal_comprobante_tipos/rSucursalComprobanteTipos.js'
import sucursal_pago_metodos from '#core/sucursal_pago_metodos/rSucursalPagoMetodos.js'
import transacciones from '#core/transacciones/rTransacciones.js'
import transaccion_items from '#core/transaccion_items/rTransaccionItems.js'

const router = Router()

router.get('/', (req, res) => {
    res.send(`Newfood's server is running`)
})

router.use('/api', verifyVersion)
router.use('/api/auth', auth)

router.use('/api', verifyToken)
router.use('/api/sistema', sistema)
router.use('/api/decolecta', decolecta)

router.use('/api/articulo_categorias', articulo_categorias)
router.use('/api/articulos', articulos)
router.use('/api/caja_aperturas', caja_aperturas)
router.use('/api/colaboradores', colaboradores)
router.use('/api/comprobante_items', comprobante_items)
router.use('/api/comprobantes', comprobantes)
router.use('/api/combo_articulos', combo_articulos)
router.use('/api/empresa', empresa)
router.use('/api/dinero_movimientos', dinero_movimientos)
router.use('/api/kardex', kardex)
router.use('/api/mesas', mesas)
router.use('/api/comprobante_tipos', comprobante_tipos)
router.use('/api/pago_metodos', pago_metodos)
router.use('/api/produccion_areas', produccion_areas)
router.use('/api/receta_insumos', receta_insumos)
router.use('/api/salones', salones)
router.use('/api/socios', socios)
router.use('/api/sucursales', sucursales)
router.use('/api/sucursal-pago-metodos', sucursal_pago_metodos)
router.use('/api/sucursal-comprobante-tipos', sucursal_comprobante_tipos)
router.use('/api/transacciones', transacciones)
router.use('/api/transaccion_items', transaccion_items)

export default router