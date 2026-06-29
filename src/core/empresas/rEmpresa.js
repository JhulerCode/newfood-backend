import { Router } from "express"
import controller from "./cEmpresa.js"
import verifyPermiso from '#http/middlewares/verifyPermiso.js'
import { uploadMem } from '#http/middlewares/uploadFiles.js'

const router = Router()

router.get(
    '/',
    verifyPermiso(['vTenants:listar']),
    controller.find
)

router.get(
    '/uno/:id',
    verifyPermiso(['vEmpresa:ver', 'vTenants:ver', 'vTenants:editar']),
    controller.findById
)

router.post(
    '/',
    verifyPermiso(['vTenants:crear']),
    controller.create
)

router.get(
    '/:empresa_id/sucursales',
    verifyPermiso(['vTenantSucursales:listar']),
    controller.findSucursales
)

router.get(
    '/:empresa_id/sucursales/:sucursal_id',
    verifyPermiso(['vTenantSucursales:ver', 'vTenantSucursales:editar']),
    controller.findSucursalById
)

router.post(
    '/:empresa_id/sucursales',
    verifyPermiso(['vTenantSucursales:crear']),
    controller.createSucursal
)

router.patch(
    '/:empresa_id/sucursales/:sucursal_id',
    verifyPermiso(['vTenantSucursales:editar']),
    controller.updateSucursal
)

router.delete(
    '/:empresa_id/sucursales/:sucursal_id',
    verifyPermiso(['vTenantSucursales:eliminar']),
    controller.deleteSucursal
)

router.patch(
    '/:id',
    verifyPermiso(['vEmpresa:editar', 'vTenants:editar']),
    uploadMem.single('archivo'),
    controller.update
)

router.delete(
    '/:id',
    verifyPermiso(['vTenants:eliminar']),
    controller.delet
)

// router.patch(
//     '/cdt/:id',
//     verifyPermiso(['vEmpresa:editar']),
//     uploadToSunat.single('archivo'),
//     controller.updateCdt
// )

export default router
