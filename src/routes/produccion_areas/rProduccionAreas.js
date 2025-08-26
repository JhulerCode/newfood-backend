import { Router } from "express"
import controller from "./cProduccionAreas.js"
import verifyPermiso from '../../middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    verifyPermiso([
        'vProduccionAreas:listar',
    ]),
    controller.find
)

router.get(
    '/uno/:id',
    verifyPermiso(['vProduccionAreas:editar']),
    controller.findById
)

router.post(
    '/',
    verifyPermiso(['vProduccionAreas:crear']),
    controller.create
)

router.patch(
    '/:id',
    verifyPermiso(['vProduccionAreas:editar']),
    controller.update
)

router.delete(
    '/:id',
    verifyPermiso(['vProduccionAreas:eliminar']),
    controller.delet
)

export default router