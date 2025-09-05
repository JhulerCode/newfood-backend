import { Router } from "express"
import controller from "./cComprobantes.js"
import verifyPermiso from '../../middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    verifyPermiso([
        'vPedidos:listar',
    ]),
    controller.find
)

router.get(
    '/uno/:id',
    verifyPermiso([
        'vReporteComprobantes:descargarPdf',
    ]),
    controller.findById
)

router.post(
    '/',
    verifyPermiso([
        'vPedidos:generarComprobante',
    ]),
    controller.create
)

router.patch(
    '/actualizar-pagos/:id',
    verifyPermiso([
        'vReporteComprobantes:agregarPagos', 'vReporteComprobantes:editarPagos',
    ]),
    controller.actualizarPago
)

router.patch(
    '/anular/:id',
    verifyPermiso([
        'vReporteComprobantes:anular',
    ]),
    controller.anular
)

router.patch(
    '/canjear/:id',
    verifyPermiso([
        'vReporteComprobantes:canjear',
    ]),
    controller.canjear
)

// router.get(
//     '/pdf/:id',
//     // verifyPermiso([
//     //     'vReporteComprobantes:descargarPdf',
//     // ]),
//     controller.loadPdf
// )

export default router