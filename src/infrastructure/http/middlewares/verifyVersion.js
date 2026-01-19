import config from "../../../config.js"

async function verifyVersion(req, res, next) {
    const app_version = req.headers['x-app-version']

    if (!app_version) {
        return res.status(426).json({ msg: `Versión antigua, recargue el sistema a la v${config.APP_VERSION}` })
    }

    if (config.APP_VERSION != app_version) {
        return res.status(426).json({ msg: `Versión antigua, recargue el sistema a la v${config.APP_VERSION}` })
    }

    next()
}

export default verifyVersion