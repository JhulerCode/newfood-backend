import jat from "../utils/jat.js"
import config from "../config.js"
import { obtenerSesion, sessionStore } from "../routes/_signin/sessions.js"
import cSistema from "../routes/_sistema/cSistema.js"

async function verifyToken(req, res, next) {
    const authorization = req.headers['authorization']

    // --- VERIFY VERSION --- //
    const app_version = req.headers['x-app-version']
    if (!app_version) {
        return res.status(303).json({ msg: 'Verión antigua, recargue el sistema' })
    }

    if (cSistema.sistemaData.app_version != app_version) {
        return res.status(303).json({ msg: 'Verión antigua, recargue el sistema' })
    }

    // --- OBTENER TOKEN --- //
    if (!authorization) return res.status(401).json({ msg: 'Token faltante' })
    if (!authorization.toLowerCase().startsWith('bearer')) return res.status(401).json({ msg: 'Token no válido' })
    const token = authorization.substring(7)

    // --- VERIFICAR TOKEN --- //
    const user = jat.decrypt(token, config.tokenMyApi)
    if (!user) return res.status(401).json({ msg: 'Sesión no válida' })

    // --- OBTENER SESSION --- //
    const session = obtenerSesion(user.id)
    if (!session || session.token !== token) return res.status(401).json({ msg: 'Sesión no válida' })

    req.user = {
        colaborador: user.id, // este es el id del jwt
        ...session
    }

    next()
}

export default verifyToken