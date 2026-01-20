import { Router } from "express"
import controller from "./cEmpresa.js"
import verifyPermiso from '#http/middlewares/verifyPermiso.js'
import { uploadMem } from '#http/middlewares/uploadFiles.js'

const router = Router()

router.get(
    '/uno/:id',
    controller.findById
)

router.patch(
    '/:id',
    verifyPermiso(['vEmpresa:editar']),
    uploadMem.single('archivo'),
    controller.update
)

// router.patch(
//     '/cdt/:id',
//     verifyPermiso(['vEmpresa:editar']),
//     uploadToSunat.single('archivo'),
//     controller.updateCdt
// )

export default router