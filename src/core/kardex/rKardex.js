import { Router } from "express"
import controller from "./cKardex.js"
import verifyPermiso from '#http/middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    verifyPermiso([
        'vInsumos:kardex',
        'vProductos:kardex',
    ]),
    controller.find
)

router.post(
    '/',
    verifyPermiso([
        'vInsumos:ajusteStock',
        'vProductos:ajusteStock',
    ]),
    controller.create
)

router.delete(
    '/:id',
    verifyPermiso([
        'vInsumos:ajusteStock',
        'vProductos:ajusteStock',
    ]),
    controller.delet
)

export default router