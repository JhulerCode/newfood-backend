import { Router } from "express"
import controller from "./cColaboradores.js"
import verifyPermiso from '#http/middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    verifyPermiso([
        'vColaboradores:listar',
        'vPedidos:crear',
    ]),
    controller.find
)

router.post(
    '/',
    verifyPermiso(['vColaboradores:crear']),
    controller.create
)

router.get(
    '/uno/:id',
    verifyPermiso(['vColaboradores:ver', 'vColaboradores:editar']),
    controller.findById
)

router.patch(
    '/:id',
    verifyPermiso(['vColaboradores:editar']),
    controller.update
)

router.delete(
    '/:id',
    verifyPermiso(['vColaboradores:eliminar']),
    controller.delet
)

router.get('/login', controller.login)

router.get('/reload-user', controller.reloadUsuario)

router.patch('/preferencias/:id', controller.preferencias)

router.patch('/tables/:id', controller.tables)

router.patch('/avances/:id', controller.avances)

export default router