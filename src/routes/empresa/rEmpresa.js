import { Router } from "express"
import controller from "./cEmpresa.js"
import verifyPermiso from '../../middlewares/verifyPermiso.js'
import { upload, uploadToSunat } from '../../utils/uploadFiles.js'

const router = Router()

router.get(
    '/',
    verifyPermiso(['vEmpresa:ver']),
    controller.findById
)

router.patch(
    '/:id',
    verifyPermiso(['vEmpresa:editar']),
    upload.single('archivo'),
    controller.update
)

router.patch(
    '/cdt/:id',
    verifyPermiso(['vEmpresa:editar']),
    uploadToSunat.single('archivo'),
    controller.updateCdt
)

export default router