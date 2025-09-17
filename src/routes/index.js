import signin from './_signin/signin.js'
import sistema from './_sistema/rSistema.js'
import verifyToken from '../middlewares/verifyToken.js'
import decolecta from '../routes/_decolecta/rDecolecta.js'

import articulo_categorias from './articulo_categorias/rArticuloCategorias.js'
import articulos from './articulos/rArticulos.js'
import cajas from './cajas/rCajas.js'
import caja_aperturas from './caja_aperturas/rCajaAperturas.js'
import colaboradores from './colaboradores/rColaboradores.js'
import comprobante_items from './comprobante_items/rComprobanteItems.js'
import comprobantes from './comprobantes/rComprobantes.js'
import empresa from './empresa/rEmpresa.js'
import dinero_movimientos from './dinero_movimientos/rDineroMovimientos.js'
import impresoras from './impresoras/rImpresoras.js'
import kardex from './kardex/rKardex.js'
import mesas from './mesas/rMesas.js'
import pago_comprobantes from './pago_comprobantes/rPagoComprobantes.js'
import pago_metodos from './pago_metodos/rPagoMetodos.js'
import produccion_areas from './produccion_areas/rProduccionAreas.js'
import receta_insumos from './receta_insumos/rRecetaInsumos.js'
import salones from './salones/rSalones.js'
import socios from './socios/rSocios.js'
import transacciones from './transacciones/rTransacciones.js'
import transaccion_items from './transaccion_items/rTransaccionItems.js'

function routes(app) {
    app.get('/', (req, res) => {
        res.status(200).send(`Newfood's server is running`)
    })

    app.use('/signin', signin)
    app.use('/api', verifyToken)
    app.use('/api/sistema', sistema)
    app.use('/api/decolecta', decolecta)

    app.use('/api/articulo_categorias', articulo_categorias)
    app.use('/api/articulos', articulos)
    app.use('/api/cajas', cajas)
    app.use('/api/caja_aperturas', caja_aperturas)
    app.use('/api/colaboradores', colaboradores)
    app.use('/api/comprobante_items', comprobante_items)
    app.use('/api/comprobantes', comprobantes)
    app.use('/api/empresa', empresa)
    app.use('/api/dinero_movimientos', dinero_movimientos)
    app.use('/api/impresoras', impresoras)
    app.use('/api/kardex', kardex)
    app.use('/api/mesas', mesas)
    app.use('/api/pago_comprobantes', pago_comprobantes)
    app.use('/api/pago_metodos', pago_metodos)
    app.use('/api/produccion_areas', produccion_areas)
    app.use('/api/receta_insumos', receta_insumos)
    app.use('/api/salones', salones)
    app.use('/api/socios', socios)
    app.use('/api/transacciones', transacciones)
    app.use('/api/transaccion_items', transaccion_items)
}

export default routes