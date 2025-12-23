import { Router } from "express"
import controller from "./cComboArticulo.js"

const router = Router()

router.post(
    '/bulk',
    controller.createBulk
)

export default router