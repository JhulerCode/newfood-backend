import { Router } from "express"
import controller from "./cSucursalArticulos.js"
import verifyPermiso from '#http/middlewares/verifyPermiso.js'

const router = Router()

router.get(
    '/',
    controller.find
)

router.patch(
    '/:id',
    verifyPermiso(['vSucursales:editar']),
    controller.update
)

export default router