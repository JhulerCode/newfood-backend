import { Router } from "express"
import controller from "./cPagoComprobantes.js"
import verifyPermiso from '../../middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    verifyPermiso([
        'vPagoComprobantes:listar',
    ]),
    controller.find
)

router.get(
    '/uno/:id',
    verifyPermiso(['vPagoComprobantes:editar']),
    controller.findById
)

router.patch(
    '/:id',
    verifyPermiso(['vPagoComprobantes:editar']),
    controller.update
)

export default router