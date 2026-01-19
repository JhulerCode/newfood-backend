import jat from "#shared/jat.js"
import config from "../../../config.js"
import { obtenerSesion } from "#store/sessions.js"
import { obtenerEmpresa } from "#store/empresas.js"

async function verifyToken(req, res, next) {
    const authorization = req.headers['authorization']
    const xEmpresa = req.headers["x-empresa"]

    if (!authorization) return res.status(401).json({ msg: 'Token faltante' })

    if (!authorization.toLowerCase().startsWith('bearer')) return res.status(401).json({ msg: 'Token no válido' })

    const token = authorization.substring(7)

    try {
        const user = jat.decrypt(token, config.tokenMyApi)
        const session = obtenerSesion(user.id)

        if (!session || session.token !== token) {
            return res.status(401).json({ msg: 'Sesión no válida' })
        }

        req.user = {
            colaborador: session.id,
            ...session
        }

        const empresa = obtenerEmpresa(xEmpresa)
        req.empresa = {
            ...empresa
        }

        next()
    }
    catch (error) {
        return res.status(401).json({ msg: 'Token inválido o expirado' })
    }
}

export default verifyToken