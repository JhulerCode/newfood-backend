import { Router } from "express"
import controller from "./cProduccionAreas.js"
import verifyPermiso from '#http/middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    verifyPermiso([
        'vImpresionAreas:listar',
    ]),
    controller.find
)

router.get(
    '/uno/:id',
    verifyPermiso(['vImpresionAreas:editar']),
    controller.findById
)

router.post(
    '/',
    verifyPermiso(['vImpresionAreas:crear']),
    controller.create
)

router.patch(
    '/:id',
    verifyPermiso(['vImpresionAreas:editar']),
    controller.update
)

router.delete(
    '/:id',
    verifyPermiso(['vImpresionAreas:eliminar']),
    controller.delet
)

export default router