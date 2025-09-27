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

        // --- VERIFICAR EMPRESA --- //
        const xEmpresa = req.headers["x-empresa"]
        const empresa = await Empresa.findOne({ where: { subdominio: xEmpresa } })
        if (!empresa) return res.json({ code: 1, msg: 'Empresa no encontrada' })

        // -- VERIFICAR COLABORADOR --- //
        const colaborador = await Colaborador.findOne({
            where: {
                usuario,
                empresa: empresa.id,
            }
        })
        
        if (colaborador == null) return res.json({ code: 1, msg: 'Usuario o contraseña incorrecta' })

        const correct = await bcrypt.compare(contrasena, colaborador.contrasena)
        if (!correct) return res.json({ code: 1, msg: 'Usuario o contraseña incorrecta' })

        // -- GUARDAR SESSION --- //
        const token = jat.encrypt({ id: colaborador.id }, config.tokenMyApi)

        const impresora_caja = await ProduccionArea.findOne({
            where: {
                nombre: 'CAJA',
                empresa: empresa.id,
            }
        })

        guardarSesion(colaborador.id, {
            token,
            nombres: colaborador.nombres,
            apellidos: colaborador.apellidos,
            cargo: colaborador.cargo,
            vista_inicial: colaborador.vista_inicial,
            theme: colaborador.theme,
            color: colaborador.color,
            format_date: colaborador.format_date,
            menu_visible: colaborador.menu_visible,
            permisos: colaborador.permisos,
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