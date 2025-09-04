import { Router } from "express"
import controller from "./cCajaAperturas.js"
import verifyPermiso from '../../middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    verifyPermiso([
        'vCajaResumen:ver',
        'vCajaMovimientos:listar',
    ]),
    controller.find
)

router.post(
    '/',
    verifyPermiso(['vCajaResumen:aperturar']),
    controller.create
)

router.patch(
    '/:id',
    verifyPermiso(['vCajaResumen:cerrar']),
    controller.cerrar
)

router.get(
    '/resumen/:id',
    verifyPermiso([
        'vCajaResumen:ver',
        'vCajaAperturas:verResumen',
    ]),
    controller.findResumen
)

export default router