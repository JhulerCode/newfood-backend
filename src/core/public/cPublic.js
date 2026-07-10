import { getComprobante, makePdf } from '#core/comprobantes/cComprobantes.js'
import { EmpresaRepository } from '#db/repositories.js'
import { guardarEmpresa, obtenerEmpresa, obtenerEmpresaPorSubdominio } from '#store/empresas.js'

const getEmpresa = async (req, res) => {
    try {
        const { subdominio } = req.params
        if (!subdominio) return res.status(400).json({ code: 1, msg: 'Subdominio requerido' })

        let empresa = await obtenerEmpresaPorSubdominio(subdominio)

        if (!empresa) {
            empresa = await EmpresaRepository.find(
                {
                    fltr: {
                        subdominio: { op: 'Es', val: subdominio },
                    },
                    cols: { exclude: [] },
                },
                true,
            )

            empresa = empresa[0]
            if (empresa) await guardarEmpresa(empresa.id, empresa)
        }

        if (!empresa) return res.status(404).json({ code: 1, msg: 'Empresa no encontrada' })

        res.json({ code: 0, data: getEmpresaPublicData(empresa) })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const getPdf = async (req, res) => {
    try {
        const { id } = req.params
        const data = await getComprobante(id)

        if (!data) {
            return res.status(404).json({ code: 1, msg: 'Comprobante no encontrado' })
        }

        let empresa = await obtenerEmpresa(data.empresa)
        if (!empresa) {
            empresa = await EmpresaRepository.find({ id: data.empresa }, true)
            if (empresa) await guardarEmpresa(empresa.id, empresa)
        }
        const buffer = await makePdf(data, empresa)

        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `inline; filename=${data.serie}-${data.numero}.pdf`)
        res.send(buffer)
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

export default {
    getEmpresa,
    getPdf,
}

function getEmpresaPublicData(empresa) {
    return {
        id: empresa.id,
        subdominio: empresa.subdominio,
        razon_social: empresa.razon_social,
        nombre_comercial: empresa.nombre_comercial,
        foto: empresa.foto,
        logo_url: empresa.foto?.url || null,
    }
}
