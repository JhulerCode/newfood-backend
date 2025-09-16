import { Router } from "express"
import controller from "./cEmpresa.js"
import verifyPermiso from '../../middlewares/verifyPermiso.js'
import { upload } from '../../utils/uploadFiles.js'

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

export default router