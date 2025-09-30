import { Router } from "express"
import controller from "./cArticulos.js"
import verifyPermiso from '../../middlewares/verifyPermiso.js'
import { uploadMem, upload } from '../../utils/uploadFiles.js'

const router = Router()

router.get(
    '/',
    verifyPermiso([
        'vInsumos:listar',
        'vProductos:listar',
        'vCombos:listar',
        'vPedidos:crear', 'vPedidos:addProductos',
    ]),
    controller.find
)

router.post(
    '/',
    verifyPermiso([
        'vInsumos:crear', 'vInsumos:clonar',
        'vProductos:crear', 'vProductos:clonar',
        'vCombos:crear',
    ]),
    uploadMem.single('archivo'),
    controller.create
)

router.patch(
    '/:id',
    verifyPermiso([
        'vInsumos:editar',
        'vProductos:editar',
        'vCombos:editar',
    ]),
    uploadMem.single('archivo'),
    controller.update
)

router.get(
    '/uno/:id',
    verifyPermiso([
        'vInsumos:editar', 'vInsumos:clonar',
        'vProductos:editar', 'vProductos:clonar',
        'vCombos:editar',
    ]),
    controller.findById
)

router.delete(
    '/:id',
    verifyPermiso([
        'vInsumos:eliminar',
        'vProductos:eliminar',
        'vCombos:eliminar',
    ]),
    controller.delet
)

router.post(
    '/bulk',
    verifyPermiso([
        'vInsumos:crearBulk',
        'vProductos:crearBulk',
    ]),
    controller.createBulk
)

router.patch(
    '/bulk/:id',
    verifyPermiso([
        'vInsumos:editarBulk',
        'vProductos:editarBulk',
    ]),
    controller.updateBulk
)

router.delete(
    '/bulk/:id',
    verifyPermiso([
        'vInsumos:eliminarBulk',
        'vProductos:eliminarBulk',
    ]),
    controller.deleteBulk
)

export default router