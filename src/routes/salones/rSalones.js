import { Router } from "express"
import controller from "./cSalones.js"
import verifyPermiso from '../../middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    verifyPermiso([
        'vSalones:listar',
    ]),
    controller.find
)

router.get(
    '/uno/:id',
    verifyPermiso(['vSalones:editar']),
    controller.findById
)

router.post(
    '/',
    verifyPermiso(['vSalones:crear']),
    controller.create
)

router.patch(
    '/:id',
    verifyPermiso(['vSalones:editar']),
    controller.update
)

router.delete(
    '/:id',
    verifyPermiso(['vSalones:eliminar']),
    controller.delet
)

export default router