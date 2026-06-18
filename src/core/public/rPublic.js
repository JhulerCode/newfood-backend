import { Router } from 'express'
import controller from './cPublic.js'

const router = Router()

router.get('/comprobantes/:id/pdf', controller.getPdf)

export default router
