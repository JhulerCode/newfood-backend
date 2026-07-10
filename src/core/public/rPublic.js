import { Router } from 'express'
import controller from './cPublic.js'

const router = Router()

router.get('/empresas/:subdominio', controller.getEmpresa)
router.get('/comprobantes/:id/pdf', controller.getPdf)

export default router
