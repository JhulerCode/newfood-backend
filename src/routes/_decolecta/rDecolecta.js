import { Router } from "express"
import axios from "axios"
import config from '../../config.js'

const router = Router()

const findDni = async (req, res) => {
    try {
        const { id } = req.params

        const response = await axios.get(`https://api.decolecta.com/v1/reniec/dni?numero=${id}`, {
            headers: {
                Authorization: `Bearer ${config.decolectaApiKey}`,
                Accept: "application/json"
            }
        })

        res.json({ code: 0, data: response.data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const findRuc = async (req, res) => {
    try {
        const { id } = req.params

        const response = await axios.get(`https://api.decolecta.com/v1/sunat/ruc?numero=${id}`, {
            headers: {
                Authorization: `Bearer ${config.decolectaApiKey}`,
                Accept: "application/json"
            }
        })

        res.json({ code: 0, data: response.data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

router.get('/dni/:id', findDni)
router.get('/ruc/:id', findRuc)

export default router