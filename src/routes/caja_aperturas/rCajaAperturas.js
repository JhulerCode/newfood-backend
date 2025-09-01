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

// router.get(
//     '/uno/:id',
//     verifyPermiso([
//         'vCajaAperturas:ver',
//         'vCajaAperturas:cerrarCaja',
//         'vCajaMovimientos:listar',
//     ]),
//     controller.findById
// )



// router.delete(
//     '/:id',
//     verifyPermiso(['vCajaAperturas:eliminar']),
//     controller.delet
// )

export default router