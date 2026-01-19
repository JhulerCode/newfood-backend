import { Router } from "express"
import controller from "./cCajaAperturas.js"
import verifyPermiso from '#http/middlewares/verifyPermiso.js'

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
    '/resumen/:id&:is_past&:fecha_apertura',
    verifyPermiso([
        'vCajaResumen:ver',
        'vCajaAperturas:verResumen',
    ]),
    controller.findResumen
)

export default router