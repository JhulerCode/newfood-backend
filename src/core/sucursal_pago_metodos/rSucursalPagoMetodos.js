import { Router } from "express"
import controller from "./cSucursalPagoMetodos.js"
import verifyPermiso from '#http/middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    verifyPermiso([
        'vPagoMetodos:listar',
    ]),
    controller.find
)

router.patch(
    '/:id',
    verifyPermiso(['vPagoMetodos:editar']),
    controller.update
)

export default router