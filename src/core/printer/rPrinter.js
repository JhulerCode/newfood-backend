import { Router } from 'express'
import controller from './cPrinter.js'
import verifyToken from '#http/middlewares/verifyToken.js'
import verifyPrinterToken from '#http/middlewares/verifyPrinterToken.js'

const router = Router()

router.post('/activate', verifyPrinterToken, controller.activate)
router.get('/jobs/pending', verifyPrinterToken, controller.pendingJobs)
router.get('/jobs/:id', verifyPrinterToken, controller.findJob)
router.post('/jobs/failed', verifyPrinterToken, controller.createFailedJob)
router.patch('/jobs/:id/status', verifyPrinterToken, controller.patchJobStatus)

router.post('/sucursales/:id/token', verifyToken, controller.generateToken)
router.post('/sucursales/:id/token/delete', verifyToken, controller.deleteToken)
router.patch('/sucursales/:id/config', verifyToken, controller.updateSucursalConfig)
router.get('/sucursales/:id/printers', verifyToken, controller.listSucursalPrinters)
router.get('/admin/jobs', verifyToken, controller.listJobs)
router.post('/admin/jobs/:id/retry', verifyToken, controller.retryJob)

export default router
