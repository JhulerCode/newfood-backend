import { Router } from "express"
import controller from "./cSucursales.js"
import verifyPermiso from '#http/middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    verifyPermiso([
        'vSucursales:listar',
    ]),
    controller.find
)

router.get(
    '/uno/:id',
    verifyPermiso(['vSucursales:editar']),
    controller.findById
)

router.post(
    '/',
    verifyPermiso(['vSucursales:crear']),
    controller.create
)

router.patch(
    '/:id',
    verifyPermiso(['vSucursales:editar']),
    controller.update
)

router.delete(
    '/:id',
    verifyPermiso(['vSucursales:eliminar']),
    controller.delet
)

export default router