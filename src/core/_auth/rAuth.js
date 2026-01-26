import { Router } from "express"
import controller from "./cAuth.js"

const router = Router()

router.post('/', controller.signin)
router.post('/logout', controller.logout)
// router.get('/empresas', controller.getEmpresas)
// router.get('/sessions', controller.getSessions)

export default router