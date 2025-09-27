import sequelize from '../../database/sequelize.js'
import { Transaccion } from '../../database/models/Transaccion.js'
import { Kardex } from '../../database/models/Kardex.js'
import { Socio } from '../../database/models/Socio.js'
import { Articulo } from '../../database/models/Articulo.js'
import { Comprobante } from '../../database/models/Comprobante.js'
import { applyFilters } from '../../utils/mine.js'
import cSistema from "../_sistema/cSistema.js"

const create = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { colaborador, empresa } = req.user
        const {
            tipo, fecha,
            articulo, cantidad,
            observacion, estado,
            transaccion,
        } = req.body

        // --- CREAR --- //
        const nuevo = await Kardex.create({
            tipo, fecha,
            articulo, cantidad,
            observacion, estado,
            transaccion,
            empresa: empresa.id,
            createdBy: colaborador
        }, { transaction })


        // --- ACTUALIZAR STOCK --- //
        const kardex_tiposMap = cSistema.arrayMap('kardex_tipos')
        const tipoInfo = kardex_tiposMap[tipo]

        await Articulo.update(
            {
                stock: sequelize.literal(`COALESCE(stock, 0) ${tipoInfo.operacion == 1 ? '+' : '-'} ${cantidad}`)
            },
            {
                where: { id: articulo },
                transaction
            }
        )

        await transaction.commit()

        res.json({ code: 0 })
    }
    catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const find = async (req, res) => {
    try {
        const { empresa } = req.user
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        const findProps = {
            attributes: ['id'],
            where: { empresa: empresa.id, },
            include: [],
            order: [['createdAt', 'DESC'], ['fecha', 'DESC']],
        }

        const include1 = {
            articulo1: {
                model: Articulo,
                as: 'articulo1',
                attributes: ['nombre', 'unidad'],
            },
            transaccion1: {
                model: Transaccion,
                as: 'transaccion1',
                attributes: ['id', 'socio', 'compra_comprobante_serie', 'compra_comprobante_correlativo'],
                required: false,

            },
            comprobante1: {
                model: Comprobante,
                as: 'comprobante1',
                attributes: ['id', 'serie', 'numero', 'serie_correlativo'],
                include: [
                    {
                        model: Socio,
                        as: 'socio1',
                        attributes: ['id', 'nombres']
                    },
                ],
            }
        }

        if (qry) {
            if (qry.incl) {
                for (const a of qry.incl) {
                    if (qry.incl.includes(a)) findProps.include.push(include1[a])
                }
            }

            if (qry.fltr) {
                const fltr1 = JSON.parse(JSON.stringify(qry.fltr))

                delete qry.fltr.articulo_nombre

                delete qry.fltr.transaccion_comprobante_pago_serie
                delete qry.fltr.transaccion_comprobante_pago_correlativo
                delete qry.fltr.transaccion_socio

                Object.assign(findProps.where, applyFilters(qry.fltr))

                if (fltr1.articulo_nombre) {
                    Object.assign(findProps.where, applyFilters({ '$articulo1.nombre$': fltr1.articulo_nombre }))
                }

                if (fltr1.transaccion_guia) {
                    Object.assign(findProps.where, applyFilters({ '$transaccion1.comprobante_pago_serie$': fltr1.transaccion_comprobante_pago_serie }))
                }

                if (fltr1.transaccion_factura) {
                    Object.assign(findProps.where, applyFilters({ '$transaccion1.comprobante_pago_correlativo$': fltr1.transaccion_comprobante_pago_correlativo }))
                }

                if (fltr1.transaccion_socio) {
                    Object.assign(findProps.where, applyFilters({ '$transaccion1.socio$': fltr1.transaccion_socio }))
                }
            }

            if (qry.cols) {
                const excludeCols = [
                    'articulo_nombre', 'articulo_unidad',
                    'comprobante_pago_serie', 'comprobante_pago_correlativo', 'transaccion_socio',
                    'more_info',
                ]
                const cols1 = qry.cols.filter(a => !excludeCols.includes(a))
                findProps.attributes = findProps.attributes.concat(cols1)
            }
        }

        let data = await Kardex.findAll(findProps)

        if (data.length > 0) {
            data = data.map(a => a.toJSON())

            const kardex_tiposMap = cSistema.arrayMap('kardex_tipos')

            for (const a of data) {
                // --- DATOS DE LOTE PADRE --- //
                if (a.tipo) {
                    const tipoInfo = kardex_tiposMap[a.tipo]

                    a.tipo1 = tipoInfo
                    a.cantidad *= tipoInfo.operacion
                }
            }
        }

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const delet = async (req, res) => {
    const transaction = await sequelize.transaction()

    try {
        const { id } = req.params
        const { tipo, articulo, cantidad } = req.body

        // --- ELIMINAR --- //
        await Kardex.destroy({
            where: { id },
            transaction
        })

        // --- ACTUALIZAR STOCK --- //
        const kardex_tiposMap = cSistema.arrayMap('kardex_tipos')
        const tipoInfo = kardex_tiposMap[tipo]

        await Articulo.update(
            {
                stock: sequelize.literal(`COALESCE(stock, 0) ${tipoInfo.operacion == 1 ? '-' : '+'} ${cantidad}`)
            },
            {
                where: { id: articulo },
                transaction
            }
        )

        await transaction.commit()

        res.json({ code: 0 })
    }
    catch (error) {
        await transaction.rollback()

        res.status(500).json({ code: -1, msg: error.message, error })
    }
}


export default {
    find,
    delet,
    create,
}