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

export default router