import { Router } from "express"
import controller from "./cDineroMovimientos.js"
import verifyPermiso from '../../middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    verifyPermiso(['vCajaMovimientos:listar']),
    controller.find
)

router.post(
    '/',
    verifyPermiso(['vCajaMovimientos:crear']),
    controller.create
)

router.delete(
    '/:id',
    verifyPermiso(['vCajaMovimientos:eliminar']),
    controller.delet
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