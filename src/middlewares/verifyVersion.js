import config from "../config.js"

async function verifyVersion(req, res, next) {
    const app_version = req.headers['x-app-version']

    if (!app_version) {
        return res.status(303).json({ msg: 'Versión antigua, recargue el sistema' })
    }

    if (config.APP_VERSION != app_version) {
        return res.status(303).json({ msg: 'Versión antigua, recargue el sistema' })
    }

    next()
}

export default verifyVersion