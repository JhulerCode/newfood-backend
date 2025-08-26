import { Router } from "express"
import controller from "./cColaboradores.js"
import verifyPermiso from '../../middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    verifyPermiso([
        'vColaboradores:listar',
        'vFormatosBpm:crear', 'vFormatosBpm:ver', 'vFormatosBpm:editar',
        'vFormatosPhs:crear', 'vFormatosPhs:ver', 'vFormatosPhs:editar',
        'vActivityLogs:listar',
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

router.patch('/preferencias/:id', controller.preferencias)

router.get('/login', controller.login)

export default router