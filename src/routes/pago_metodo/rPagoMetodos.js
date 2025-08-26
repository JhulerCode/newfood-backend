import { Router } from "express"
import controller from "./cPagoMetodos.js"
import verifyPermiso from '../../middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    verifyPermiso([
        'vPagoMetodos:listar',
    ]),
    controller.find
)

router.get(
    '/uno/:id',
    verifyPermiso(['vPagoMetodos:editar']),
    controller.findById
)

router.post(
    '/',
    verifyPermiso(['vPagoMetodos:crear']),
    controller.create
)

router.patch(
    '/:id',
    verifyPermiso(['vPagoMetodos:editar']),
    controller.update
)

router.delete(
    '/:id',
    verifyPermiso(['vPagoMetodos:eliminar']),
    controller.delet
)

export default router