import { Router } from "express"
import controller from "./cComprobanteTipos.js"
import verifyPermiso from '#http/middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    verifyPermiso([
        'vComprobanteTipos:listar',
        'vPedidos:generarComprobante',
    ]),
    controller.find
)

router.get(
    '/uno/:id',
    verifyPermiso(['vComprobanteTipos:editar']),
    controller.findById
)

router.patch(
    '/:id',
    verifyPermiso(['vComprobanteTipos:editar']),
    controller.update
)

export default router