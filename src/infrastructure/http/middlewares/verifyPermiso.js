function verifyPermiso(requiredPermissions = []) {
    return (req, res, next) => {
        const log = {
            colaborador: req.user.colaborador,
            method: req.method,
            baseUrl: req.baseUrl + req.path,
            detail: {
                params: req.params,
                query: req.query,
                body: req.body,
            },
            ip: req.ip,
        }

        console.log(req.user.nombres, log.method, log.baseUrl, log.detail.params)

        if (requiredPermissions.length == 0) return next()

        const userPermissions = req.user?.permisos || []

        const hasPermission = requiredPermissions.some(perm =>
            userPermissions.includes(perm)
        )

        log.hasPermission = hasPermission

        if (!hasPermission) return res.status(403).json({ msg: 'Acceso denegado: permisos insuficientes' })

        next()
    }
}

export default verifyPermiso