import { verifyPrinterToken as verifyToken } from '#core/printer/sPrinter.js'

async function verifyPrinterToken(req, res, next) {
    const authorization = req.headers['authorization']
    if (!authorization) return res.status(401).json({ msg: 'Token de impresora faltante' })

    if (!authorization.toLowerCase().startsWith('printer ')) {
        return res.status(401).json({ msg: 'Token de impresora no valido' })
    }

    try {
        const token = authorization.substring(8)
        const sucursal = await verifyToken(token)

        if (!sucursal) return res.status(401).json({ msg: 'Token de impresora no valido' })
        if (!sucursal.printer_agent_enabled) {
            return res.status(403).json({ msg: 'Agente de impresora desactivado' })
        }

        req.printerSucursal = sucursal
        next()
    } catch (error) {
        return res.status(401).json({ msg: 'Token de impresora invalido' })
    }
}

export default verifyPrinterToken
