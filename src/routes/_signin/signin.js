import bcrypt from 'bcrypt'
import config from "../../config.js"
import jat from '../../utils/jat.js'
import { guardarSesion, borrarSesion, sessionStore } from './sessions.js'

import { Router } from "express"
import { Colaborador } from '../../database/models/Colaborador.js'
import { Empresa } from '../../database/models/Empresa.js'
import { ProduccionArea } from '../../database/models/ProduccionArea.js'

const router = Router()

const signin = async (req, res) => {
    try {
        const { usuario, contrasena } = req.body

        const data = await Colaborador.findOne({
            where: { usuario },
            // attributes: ['id', 'contrasena', 'nombres', 'apellidos', 'cargo', 'permisos', 'vista_inicial', 'theme', 'color', 'format_date', 'menu_visible'],
        })

        const host = req.hostname
        const subdominio = host.split('.')[0]
        console.log(host)
        console.log(subdominio)
        throw error

        const empresa = await Empresa.findByPk('1')
        const impresora_caja = await ProduccionArea.findByPk('1')

        if (data == null) return res.json({ code: 1, msg: 'Usuario o contraseña incorrecta' })

        const correct = await bcrypt.compare(contrasena, data.contrasena)
        if (!correct) return res.json({ code: 1, msg: 'Usuario o contraseña incorrecta' })

        const token = jat.encrypt({
            colaborador: data.id,
        }, config.tokenMyApi)

        guardarSesion(data.id, {
            token,
            nombres: data.nombres,
            apellidos: data.apellidos,
            cargo: data.cargo,
            vista_inicial: data.vista_inicial,
            theme: data.theme,
            color: data.color,
            format_date: data.format_date,
            menu_visible: data.menu_visible,
            permisos: data.permisos,
            empresa: empresa,
            impresora_caja: impresora_caja,
        })

        res.json({ code: 0, token })
    }
    catch (error) {
        res.status(500).send({ code: -1, msg: error.message, error })
    }
}

const logout = async (req, res) => {
    try {
        const { id } = req.body
        borrarSesion(id)

        res.json({ code: 0 })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

router.post('/', signin)
router.post('/logout', logout)

export default router