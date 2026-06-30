import { Router } from 'express'
import controller from './cComprobantes.js'
import verifyPermiso from '#http/middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    verifyPermiso(['vReporteComprobantes:listar', 'vCajaComprobantes:listar']),
    controller.find,
)

router.get(
    '/uno/:id',
    verifyPermiso([
        'vReporteComprobantes:imprimir',
        'vCajaComprobantes:ver',
        'vCajaComprobantes:imprimir',
    ]),
    controller.findById,
)

router.get(
    '/pdf/:id',
    verifyPermiso(['vReporteComprobantes:descargarPdf', 'vCajaComprobantes:descargarPdf']),
    controller.getPdf,
)

router.post(
    '/send-mail',
    verifyPermiso(['vReporteComprobantes:enviarCorreo', 'vCajaComprobantes:enviarCorreo']),
    controller.sendMail,
)

router.post(
    '/send-whatsapp',
    verifyPermiso([
        'vReporteComprobantes:enviarWhatsapp',
        'vCajaComprobantes:enviarWhatsapp',
    ]),
    controller.sendWhatsapp,
)

router.post('/', verifyPermiso(['vCajaComprobantes:crear']), controller.create)

router.patch(
    '/actualizar-pagos/:id',
    verifyPermiso([
        'vReporteComprobantes:agregarPagos',
        'vReporteComprobantes:editarPagos',
        'vCajaComprobantes:agregarPagos',
        'vCajaComprobantes:editarPagos',
    ]),
    controller.actualizarPago,
)

router.patch(
    '/anular/:id',
    verifyPermiso(['vReporteComprobantes:anular', 'vCajaComprobantes:anular']),
    controller.anular,
)

router.patch(
    '/canjear/:id',
    verifyPermiso(['vReporteComprobantes:canjear', 'vCajaComprobantes:canjear']),
    controller.canjear,
)

router.get('/dashboard', verifyPermiso(['vDashboard:ver']), controller.resumen)

// --- Mifact --- //
router.get(
    '/estado/uno',
    verifyPermiso(['vReporteComprobantes:consultarEstado']),
    controller.consultarEstado,
)

router.get(
    '/xml',
    verifyPermiso(['vReporteComprobantes:descargarXml', 'vReporteComprobantes:descargarCdr']),
    controller.downloadXml,
)

export default router
