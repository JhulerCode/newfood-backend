import bcrypt from 'bcrypt'
import config from "../../config.js"
import jat from '#shared/jat.js'
import { guardarSesion, borrarSesion, sessionStore } from '#store/sessions.js'
import { obtenerEmpresa, guardarEmpresa, empresasStore } from '#store/empresas.js'

import { Repository } from '#db/Repository.js'

const EmpresaRepository = new Repository('Empresa')
const ColaboradorRepository = new Repository('Colaborador')
import { ProduccionArea } from '#db/models/ProduccionArea.js'

const signin = async (req, res) => {
    try {
        const { usuario, contrasena } = req.body

        // --- VERIFICAR EMPRESA --- //
        const xEmpresa = req.headers["x-empresa"]

        let empresa = obtenerEmpresa(xEmpresa)
        if (!empresa) {
            const qry = {
                fltr: {
                    subdominio: { op: 'Es', val: xEmpresa }
                },
                cols: { exclude: [] }
            }

            const empresas = await EmpresaRepository.find(qry, true)
            if (empresas.length == 0) return res.json({ code: 1, msg: 'Empresa no encontrada' })

            empresa = empresas[0]
            guardarEmpresa(xEmpresa, empresa)
        }

        // -- VERIFICAR COLABORADOR --- //
        const qry1 = {
            fltr: {
                usuario: { op: 'Es', val: usuario },
                empresa: { op: 'Es', val: empresa.id }
            },
            cols: { exclude: [] }
        }

        const colaboradores = await ColaboradorRepository.find(qry1, true)
        if (colaboradores.length == 0) return res.json({ code: 1, msg: 'Usuario o contraseña incorrecta' })

        const colaborador = colaboradores[0]

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

        delete colaborador.contrasena
        guardarSesion(colaborador.id, {
            token,
            ...colaborador,
            impresora_caja,
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

export default {
    signin,
    logout,
}