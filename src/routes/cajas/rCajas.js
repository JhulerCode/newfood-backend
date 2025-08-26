import { Router } from "express"
import controller from "./cCajas.js"
import verifyPermiso from '../../middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    verifyPermiso([
        'vCajas:listar',
    ]),
    controller.find
)

router.get(
    '/uno/:id',
    verifyPermiso(['vCajas:editar']),
    controller.findById
)

router.post(
    '/',
    verifyPermiso(['vCajas:crear']),
    controller.create
)

router.patch(
    '/:id',
    verifyPermiso(['vCajas:editar']),
    controller.update
)

router.delete(
    '/:id',
    verifyPermiso(['vCajas:eliminar']),
    controller.delet
)

export default router