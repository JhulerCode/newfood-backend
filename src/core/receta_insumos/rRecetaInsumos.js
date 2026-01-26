import { Router } from "express"
import controller from "./cRecetaInsumos.js"
import verifyPermiso from "#http/middlewares/verifyPermiso.js"

const router = Router()

router.get(
    '/',
    verifyPermiso([
        'vProductos:listarReceta',
    ]),
    controller.find
)

router.post(
    '/',
    verifyPermiso(['vProductos:crearReceta']),
    controller.create
)

router.patch(
    '/:id',
    verifyPermiso(['vProductos:editarReceta']),
    controller.update
)

router.delete(
    '/:id',
    verifyPermiso(['vProductos:eliminarReceta']),
    controller.delet
)

export default router