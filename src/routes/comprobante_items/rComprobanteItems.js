import { Router } from "express"
import controller from "./cComprobanteItems.js"
import verifyPermiso from '../../middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    verifyPermiso([
        'vComprobantesDetallado:listar',
    ]),
    controller.find
)

export default router