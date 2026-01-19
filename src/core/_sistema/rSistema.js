import { Router } from "express"
import controller from "./cSistema.js"

const router = Router()

router.get('/', controller.find)

export default router