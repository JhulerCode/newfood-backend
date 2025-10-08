import cSistema from "../routes/_sistema/cSistema.js"

async function verifyVersion(req, res, next) {
    const app_version = req.headers['x-app-version']
    
    if (!app_version) {
        return res.status(303).json({ msg: 'Versión antigua, recargue el sistema' })
    }

    if (cSistema.sistemaData.app_version != app_version) {
        return res.status(303).json({ msg: 'Versión antigua, recargue el sistema' })
    }

    next()
}

export default verifyVersion