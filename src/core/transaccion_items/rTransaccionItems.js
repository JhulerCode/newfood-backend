import { Router } from "express"
import controller from "./cTransaccionItems.js"
import verifyPermiso from '#http/middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    controller.find
)

router.post(
    '/',
    verifyPermiso([
        'vCompras:crear',
    ]),
    controller.create
)

router.patch(
    '/:id',
    verifyPermiso([
        'vCompras:editar',
    ]),
    controller.update
)

router.delete(
    '/:id',
    verifyPermiso([
        'vCompras:eliminar',
    ]),
    controller.delet
)

export default router