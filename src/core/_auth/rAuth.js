import { Router } from "express"
import controller from "./cAuth.js"
import { authRateLimiter } from "#http/middlewares/rateLimiter.js"

const router = Router()

// router.post('/', controller.signin)
router.post('/', authRateLimiter, controller.signin)
router.post('/refresh', controller.refresh)
router.post('/logout', controller.logout)
router.post('/refresh-empresa', controller.refreshEmpresa)

export default router
