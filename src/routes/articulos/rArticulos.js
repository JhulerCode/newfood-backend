import { Router } from "express"
import controller from "./cArticulos.js"
import verifyPermiso from '../../middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    verifyPermiso([
        'vInsumos:listar',
    ]),
    controller.find
)

router.post(
    '/',
    verifyPermiso([
        'vInsumos:crear', 'vInsumos:clonar',
    ]),
    controller.create
)

router.patch(
    '/:id',
    verifyPermiso([
        'vInsumos:editar',
    ]),
    controller.update
)

router.get(
    '/uno/:id',
    verifyPermiso([
        'vInsumos:editar', 'vInsumos:clonar',
    ]),
    controller.findById
)

router.delete(
    '/:id',
    verifyPermiso([
        'vInsumos:eliminar',
    ]),
    controller.delet
)

router.post(
    '/bulk',
    verifyPermiso([
        'vInsumos:crearBulk',
    ]),
    controller.createBulk
)

router.patch(
    '/bulk/:id',
    verifyPermiso([
        'vInsumos:editarBulk',
    ]),
    controller.updateBulk
)

router.delete(
    '/bulk/:id',
    verifyPermiso([
        'vInsumos:eliminarBulk',
    ]),
    controller.deleteBulk
)

export default router