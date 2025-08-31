import { Router } from "express"
import controller from "./cComprobantes.js"
import verifyPermiso from '../../middlewares/verifyPermiso.js'

const router = Router()

// router.get(
//     '/',
//     verifyPermiso([
//         'vCompras:listar',
//         'vPedidos:listar'
//     ]),
//     controller.find
// )

router.post(
    '/',
    verifyPermiso([
        'vPedidos:generarComprobante',
    ]),
    controller.create
)

// router.get(
//     '/uno/:id',
//     verifyPermiso([
//         'vCompras:ver', 'vCompras:editar',
//         'vPedidos:editar',
//     ]),
//     controller.findById
// )

// router.patch(
//     '/:id',
//     verifyPermiso([
//         'vCompras:editar',
//         'vPedidos:editar',
//     ]),
//     controller.update
// )

// router.delete(
//     '/:id',
//     verifyPermiso([
//         'vCompras:eliminar',
//         // 'vPedidos:eliminar',
//     ]),
//     controller.delet
// )

// router.patch(
//     '/anular/:id',
//     verifyPermiso([
//         'vCompras:anular',
//         'vPedidos:anular',
//     ]),
//     controller.anular
// )

export default router