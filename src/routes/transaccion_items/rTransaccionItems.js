import { Router } from "express"
import controller from "./cTransaccionItems.js"
import verifyPermiso from '../../middlewares/verifyPermiso.js'

const router = Router()

// router.get(
//     '/',
//     verifyPermiso([
//         'vCompras:listar',
//         'vVentas:listar'
//     ]),
//     controller.find
// )

router.post(
    '/',
    verifyPermiso([
        'vCompras:crear',
        'vVentas:crear',
    ]),
    controller.create
)

// router.get(
//     '/uno/:id',
//     verifyPermiso([
//         'vCompras:ver',
//         'vVentas:ver',
//     ]),
//     controller.findById
// )

router.patch(
    '/:id',
    verifyPermiso([
        'vCompras:editar',
        'vVentas:editar',
    ]),
    controller.update
)

router.delete(
    '/:id',
    verifyPermiso([
        'vCompras:eliminar',
        'vVentas:eliminar',
    ]),
    controller.delet
)

export default router