import { Router } from "express"
import controller from "./cComprobanteItems.js"
import verifyPermiso from '#http/middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    verifyPermiso([
        'vComprobantesDetallado:listar',
    ]),
    controller.find
)

export default router