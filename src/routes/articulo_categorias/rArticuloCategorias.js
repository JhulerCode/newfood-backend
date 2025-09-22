import { Router } from "express"
import controller from "./cArticuloCategorias.js"
import verifyPermiso from '../../middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    verifyPermiso([
        'vArticuloCategorias:listar',
        'vPedidos:crear', 'vPedidos:addProductos',
    ]),
    controller.find
)

router.post(
    '/',
    verifyPermiso([
        'vArticuloCategorias:crear',
    ]),
    controller.create
)

router.get(
    '/uno/:id',
    verifyPermiso([
        'vArticuloCategorias_ver', 'vArticuloCategorias:editar',
    ]),
    controller.findById
)

router.patch(
    '/:id',
    verifyPermiso([
        'vArticuloCategorias:editar',
    ]),
    controller.update
)

router.delete(
    '/:id',
    verifyPermiso([
        'vArticuloCategorias:eliminar',
    ]),
    controller.delet
)

export default router