import { Router } from 'express'
import controller from './cSucursalArticuloVariants.js'
import verifyPermiso from '#http/middlewares/verifyPermiso.js'

const router = Router()
const permisos = [
    'vSucursales:editar',
    'vInsumos:listar',
    'vInsumos:editar',
    'vProductos:listar',
    'vProductos:editar',
    'vInventarioInsumos:listar',
    'vInventarioInsumos:editar',
    'vInventarioProductos:listar',
    'vInventarioProductos:editar',
]

router.get('/', verifyPermiso(permisos), controller.find)
router.patch('/:id', verifyPermiso(['vSucursales:editar']), controller.update)

export default router
