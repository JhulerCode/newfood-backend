import { Router } from "express"
import controller from "./cMesas.js"
import verifyPermiso from '../../middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    verifyPermiso([
        'vSalones:listarMesa',
    ]),
    controller.find
)

router.get(
    '/uno/:id',
    verifyPermiso(['vSalones:editarMesa']),
    controller.findById
)

router.post(
    '/',
    verifyPermiso(['vSalones:crearMesa']),
    controller.create
)

router.patch(
    '/:id',
    verifyPermiso(['vSalones:editarMesa']),
    controller.update
)

router.delete(
    '/:id',
    verifyPermiso(['vSalones:eliminarMesa']),
    controller.delet
)

router.post(
    '/unir',
    verifyPermiso(['vPedidos:unirMesas']),
    controller.unir
)

router.post(
    '/desunir',
    verifyPermiso(['vPedidos:unirMesas']),
    controller.desunir
)

export default router