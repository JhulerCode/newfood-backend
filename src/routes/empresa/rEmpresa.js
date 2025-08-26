import { Router } from "express"
import controller from "./cEmpresa.js"
import verifyPermiso from '../../middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    verifyPermiso(['vEmpresa:ver']),
    controller.findById
)

router.patch(
    '/:id',
    verifyPermiso(['vEmpresa:editar']),
    controller.update
)

export default router