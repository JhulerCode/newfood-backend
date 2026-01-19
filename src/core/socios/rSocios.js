import { Router } from "express"
import controller from "./cSocios.js"
import verifyPermiso from '#http/middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    verifyPermiso([
        'vProveedores:listar',
        'vClientes:listar',
        'vPedidos:crear',
        'vPedidos:editarDetalles',
        'vPedidos:generarComprobante',
    ]),
    controller.find
)

router.post(
    '/',
    verifyPermiso([
        'vProveedores:crear',
        'vClientes:crear'
    ]),
    controller.create
)

router.patch(
    '/:id',
    verifyPermiso([
        'vProveedores:editar',
        'vClientes:editar'
    ]),
    controller.update
)

router.get(
    '/uno/:id',
    verifyPermiso([
        'vProveedores:ver', 'vProveedores:editar',
        'vClientes:ver', 'vClientes:editar'
    ]),
    controller.findById
)

router.delete(
    '/:id',
    verifyPermiso([
        'vProveedores:eliminar',
        'vClientes:eliminar'
    ]),
    controller.delet
)

export default router