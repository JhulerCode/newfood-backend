import { ComprobanteItemRepository } from '#db/repositories.js'
import { arrayMap } from '#store/system.js'
import { redondear } from '#shared/mine.js'

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        qry.fltr.empresa = { op: 'Es', val: empresa }

        const data = await ComprobanteItemRepository.find(qry, true)

        if (data.length > 0) {
            const pago_comprobantesMap = arrayMap('comprobante_tipos')
            const comprobante_estadosMap = arrayMap('comprobante_estados')

            for (const a of data) {
                if (a.comprobante1) {
                    a.comprobante1.estado1 = comprobante_estadosMap[a.comprobante1.estado]
                }

                if (qry?.cols?.includes('pu') && qry.cols.includes('cantidad')) {
                    const prd = calcularUno({
                        pu: Number(a.pu),
                        descuento_tipo: a.descuento_tipo,
                        descuento_valor: a.descuento_valor,
                        cantidad: Number(a.cantidad),
                    })

                    a.cantidad = a.cantidad * 1

                    if (a.descuento_tipo == 1) {
                        a.descuento_mostrar = 'S/ ' + redondear(a.descuento_valor)
                    } else if (a.descuento_tipo == 2) {
                        a.descuento_mostrar = a.descuento_valor + '%'
                    } else {
                        a.descuento_mostrar = null
                    }
                    a.pu_desc = prd.pu_desc
                    a.descuento = prd.descuento
                    a.total = prd.total
                }
            }
        }

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

function calcularUno(item) {
    if (
        item.descuento_tipo != null &&
        item.descuento_valor != null &&
        item.descuento_valor != 0
    ) {
        if (item.descuento_tipo == 1) {
            item.pu_desc = item.descuento_valor
        } else if (item.descuento_tipo == 2) {
            item.pu_desc = item.cantidad * item.pu * (item.descuento_valor / 100)
        }
    } else {
        item.pu_desc = 0
    }

    item.descuento = item.pu_desc
    item.total = (item.cantidad * item.pu) - item.descuento

    return item
}

export default {
    find,
}