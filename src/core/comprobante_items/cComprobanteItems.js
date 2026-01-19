import { Comprobante, ComprobanteItem } from '#db/models/Comprobante.js'
import { Articulo } from '#db/models/Articulo.js'
import { arrayMap } from '#store/system.js'
import { applyFilters, redondear } from '#shared/mine.js'

const include1 = {
    comprobante1: {
        model: Comprobante,
        as: 'comprobante1',
        attributes: ['doc_tipo', 'serie', 'numero', 'fecha_emision', 'estado']
    },
    articulo1: {
        model: Articulo,
        as: 'articulo1',
        attributes: ['nombre']
    }
}

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        const findProps = {
            attributes: ['id'],
            where: { empresa: empresa.id },
            include: [],
            order: [['createdAt', 'DESC']],
        }

        if (qry) {
            if (qry.incl) {
                for (const a of qry.incl) {
                    if (qry.incl.includes(a)) findProps.include.push(include1[a])
                }
            }

            if (qry.fltr) {
                const fltr1 = JSON.parse(JSON.stringify(qry.fltr))

                delete qry.fltr.comprobante_fecha
                delete qry.fltr.comprobante_tipo
                delete qry.fltr.comprobante_serie
                delete qry.fltr.comprobante_correlativo
                delete qry.fltr.comprobante_estado

                Object.assign(findProps.where, applyFilters(qry.fltr))

                if (fltr1.comprobante_fecha) {
                    Object.assign(findProps.where, applyFilters({ '$comprobante1.fecha_emision$': fltr1.comprobante_fecha }))
                }

                if (fltr1.comprobante_tipo) {
                    Object.assign(findProps.where, applyFilters({ '$comprobante1.doc_tipo$': fltr1.comprobante_tipo }))
                }

                if (fltr1.comprobante_serie) {
                    Object.assign(findProps.where, applyFilters({ '$comprobante1.serie$': fltr1.comprobante_serie }))
                }

                if (fltr1.comprobante_correlativo) {
                    Object.assign(findProps.where, applyFilters({ '$comprobante1.numero$': fltr1.comprobante_correlativo }))
                }

                if (fltr1.comprobante_estado) {
                    Object.assign(findProps.where, applyFilters({ '$comprobante1.estado$': fltr1.comprobante_estado }))
                }
            }

            if (qry.cols) {
                if (qry.cols.includes('pu')) qry.cols.push('descuento_tipo', 'descuento_valor')

                const excludeCols = [
                    'comprobante_fecha', 'comprobante_tipo', 'comprobante_serie', 'comprobante_correlativo', 'comprobante_estado',
                    'descuento_mostrar', 'total'
                ]
                const cols1 = qry.cols.filter(a => !excludeCols.includes(a))
                findProps.attributes = findProps.attributes.concat(cols1)
            }
        }

        let data = await ComprobanteItem.findAll(findProps)

        if (data.length > 0 && qry.cols) {
            data = data.map(a => a.toJSON())

            const pago_comprobantesMap = arrayMap('comprobante_tipos')
            const comprobante_estadosMap = arrayMap('comprobante_estados')

            for (const a of data) {
                const tKey = a.comprobante1.doc_tipo.replace(`${empresa.subdominio}-`, '')
                a.comprobante1.doc_tipo1 = pago_comprobantesMap[tKey]
                a.comprobante_estado1 = comprobante_estadosMap[a.comprobante1.estado]
                a.comprobante_estado = a.comprobante_estado1.id

                if (qry.cols.includes('pu') && qry.cols.includes('cantidad')) {
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