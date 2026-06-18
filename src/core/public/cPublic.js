import { getComprobante, makePdf } from '#core/comprobantes/cComprobantes.js'
import { obtenerEmpresa } from '#store/empresas.js'

const getPdf = async (req, res) => {
    try {
        const { id } = req.params
        const data = await getComprobante(id)

        if (!data) {
            return res.status(404).json({ code: 1, msg: 'Comprobante no encontrado' })
        }

        const empresa = obtenerEmpresa(data.empresa)
        const buffer = await makePdf(data, empresa)

        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `inline; filename=${data.serie}-${data.numero}.pdf`)
        res.send(buffer)
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

export default {
    getPdf,
}
