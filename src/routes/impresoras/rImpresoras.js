import { Router } from "express"
import controller from "./cImpresoras.js"
import verifyPermiso from '../../middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    verifyPermiso([
        'vImpresoras:listar',
    ]),
    controller.find
)

router.get(
    '/uno/:id',
    verifyPermiso(['vImpresoras:editar']),
    controller.findById
)

router.post(
    '/',
    verifyPermiso(['vImpresoras:crear']),
    controller.create
)

router.patch(
    '/:id',
    verifyPermiso(['vImpresoras:editar']),
    controller.update
)

router.delete(
    '/:id',
    verifyPermiso(['vImpresoras:eliminar']),
    controller.delet
)

export default router