import { Router } from "express"
import controller from "./cTransacciones.js"
import verifyPermiso from '../../middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    verifyPermiso([
        'vCompras:listar',
        'vPedidos:listar'
    ]),
    controller.find
)

router.post(
    '/',
    verifyPermiso([
        'vCompras:crear',
        'vPedidos:crear',
    ]),
    controller.create
)

router.get(
    '/uno/:id',
    verifyPermiso([
        'vCompras:ver', 'vCompras:editar',
        'vPedidos:ver',
        // 'vPedidos:editar',
        'vPedidos:imprimirComanda',
        'vPedidos:imprimirPrecuenta',
    ]),
    controller.findById
)

router.patch(
    '/:id',
    verifyPermiso([
        'vCompras:editar',
        // 'vPedidos:editar',
        'vPedidos:editarDetalles',
    ]),
    controller.update
)

router.delete(
    '/:id',
    verifyPermiso([
        'vCompras:eliminar',
        'vPedidos:eliminar',
    ]),
    controller.delet
)

// --- PARA VENTAS --- //
router.patch(
    '/add-productos/:id',
    verifyPermiso([
        'vPedidos:addProductos',
    ]),
    controller.addProductos
)

router.patch(
    '/anular/:id',
    verifyPermiso([
        // 'vCompras:anular',
        'vPedidos:anular',
    ]),
    controller.anular
)

// router.get(
//     '/ventas-pendientes',
//     verifyPermiso([
//         'vPedidos:listar',
//     ]),
//     controller.ventasPendientes
// )

router.patch(
    '/cambiar-mesa/:id',
    verifyPermiso(['vPedidos:cambiarMesa']),
    controller.cambiarMesa
)

router.patch(
    '/entregar/:id',
    verifyPermiso(['vPedidos:entregar']),
    controller.entregar
)

export default router