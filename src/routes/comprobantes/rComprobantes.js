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
    verifyPermiso(['vReporteComprobantes:imprimir']),
    controller.findById
)

router.get(
    '/pdf/:id',
    verifyPermiso([
        'vReporteComprobantes:descargarPdf',
    ]),
    controller.getPdf
)

router.get(
    '/xml/:id',
    verifyPermiso([
        'vReporteComprobantes:descargarXml',
    ]),
    controller.downloadXml
)

router.post(
    '/send-mail',
    verifyPermiso([
        'vReporteComprobantes:enviarCorreo',
    ]),
    controller.sendMail
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

router.get(
    '/dashboard',
    verifyPermiso([
        'vDashboard:ver',
    ]),
    controller.resumen
)

export default router