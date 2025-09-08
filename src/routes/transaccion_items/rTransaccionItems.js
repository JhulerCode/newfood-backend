import { Router } from "express"
import controller from "./cTransaccionItems.js"
import verifyPermiso from '../../middlewares/verifyPermiso.js'

const router = Router()

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