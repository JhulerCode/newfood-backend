import { Op, Sequelize, literal } from 'sequelize'
import { Articulo } from '#db/models/Articulo.js'
import { ArticuloCategoria } from '#db/models/ArticuloCategoria.js'
import { CajaApertura } from '#db/models/CajaApertura.js'
import { Colaborador } from '#db/models/Colaborador.js'
import { ComboArticulo } from '#db/models/ComboArticulo.js'
import { Comprobante, ComprobanteItem } from '#db/models/Comprobante.js'
import { DineroMovimiento } from '#db/models/DineroMovimiento.js'
import { Empresa } from '#db/models/Empresa.js'
import { Kardex } from '#db/models/Kardex.js'
import { Mesa } from '#db/models/Mesa.js'
import { ComprobanteTipo } from '#db/models/ComprobanteTipo.js'
import { PagoMetodo } from '#db/models/PagoMetodo.js'
import { ProduccionArea } from '#db/models/ProduccionArea.js'
import { RecetaInsumo } from '#db/models/RecetaInsumo.js'
import { Salon } from '#db/models/Salon.js'
import { Socio } from '#db/models/Socio.js'
import { Transaccion, TransaccionItem } from '#db/models/Transaccion.js'

import { applyFilters } from '#db/helpers.js'
import { sistemaData } from '#store/system.js'

export const models = {
    Articulo,
    ArticuloCategoria,
    CajaApertura,
    Colaborador,
    ComboArticulo,
    Comprobante,
    ComprobanteItem,
    DineroMovimiento,
    Empresa,
    Kardex,
    Mesa,
    ComprobanteTipo,
    PagoMetodo,
    ProduccionArea,
    RecetaInsumo,
    Salon,
    Socio,
    Transaccion,
    TransaccionItem,
}

const include1 = {
    categoria1: {
        model: ArticuloCategoria,
        as: 'categoria1',
        attributes: ['id', 'nombre'],
    },
    articulo1: {
        model: Articulo,
        as: 'articulo1',
        attributes: ['id', 'nombre', 'unidad', 'has_receta'],
    },
    colaborador1: {
        model: Colaborador,
        as: 'colaborador1',
        attributes: ['id', 'nombres', 'apellidos', 'nombres_apellidos'],
    },
    caja_apertura1: {
        model: CajaApertura,
        as: 'caja_apertura1',
        attributes: ['id', 'fecha_apertura', 'fecha_apertura'],
    },
    canjeado_por1: {
        model: Comprobante,
        as: 'canjeado_por1',
        attributes: ['id', 'doc_tipo', 'serie', 'numero', 'serie_correlativo'],
    },
    combo_articulos: {
        model: ComboArticulo,
        as: 'combo_articulos',
        attributes: ['articulo_principal', 'articulo', 'cantidad'],
        // include: {
        //     model: Articulo,
        //     as: 'articulo1',
        //     attributes: ['id', 'nombre', 'unidad', 'has_receta'],
        //     include: {
        //         model: RecetaInsumo,
        //         as: 'receta_insumos',
        //         attributes: ['articulo_principal', 'articulo', 'cantidad']
        //     }
        // }
    },
    comprobante1: {
        model: Comprobante,
        as: 'comprobante1',
        attributes: ['id', 'doc_tipo', 'serie', 'numero', 'serie_correlativo', 'monto'],
    },
    comprobante_items: {
        model: ComprobanteItem,
        as: 'comprobante_items',
        attributes: [
            'id',
            'articulo',
            'descripcion',
            'pu',
            'descuento_tipo',
            'descuento_valor',
            'cantidad',
        ],
    },
    createdBy1: {
        model: Colaborador,
        as: 'createdBy1',
        attributes: ['id', 'nombres', 'apellidos', 'nombres_apellidos'],
    },
    dinero_movimientos: {
        model: DineroMovimiento,
        as: 'dinero_movimientos',
        attributes: ['id', 'pago_metodo', 'monto', 'caja_apertura'],
        include: {
            model: PagoMetodo,
            as: 'pago_metodo1',
            attributes: ['id', 'nombre', 'color'],
        },
    },
    kardexes: {
        model: Kardex,
        as: 'kardexes',
        attributes: [],
        required: false,
    },
    mesas: {
        model: Mesa,
        as: 'mesas',
        attributes: ['id', 'nombre', 'activo', 'unida', 'unidos'],
    },
    pago_metodo1: {
        model: PagoMetodo,
        as: 'pago_metodo1',
        attributes: ['id', 'nombre', 'color'],
    },
    produccion_area1: {
        model: ProduccionArea,
        as: 'produccion_area1',
        attributes: ['id', 'impresora_tipo', 'impresora', 'nombre'],
    },
    receta_insumos: {
        model: RecetaInsumo,
        as: 'receta_insumos',
        attributes: ['id', 'articulo', 'cantidad', 'orden'],
    },
    salon1: {
        model: Salon,
        as: 'salon1',
        attributes: ['id', 'nombre'],
    },
    socio1: {
        model: Socio,
        as: 'socio1',
        attributes: ['id', 'nombres', 'doc_nombres'],
    },
    transaccion1: {
        model: Transaccion,
        as: 'transaccion1',
        attributes: ['id', 'fecha', 'socio'],
        required: false,
    },
    transaccion_items: {
        model: TransaccionItem,
        as: 'transaccion_items',
    },
    venta_mesa1: {
        model: Mesa,
        as: 'venta_mesa1',
        attributes: ['id', 'nombre'],
    },
}

const sqls1 = {
    comprobantes_monto: [
        literal(
            `(SELECT COALESCE(SUM(c.monto), 0) FROM comprobantes AS c WHERE c.transaccion = "transacciones"."id")`,
        ),
        'comprobantes_monto',
    ],
    pagos_monto: [
        literal(
            `(SELECT COALESCE(SUM(c.monto), 0) FROM dinero_movimientos AS c WHERE c.transaccion = "transacciones"."id")`,
        ),
        'pagos_monto',
    ],
    // articulo_movimientos_cantidad: [
    //     Sequelize.fn('COALESCE',
    //         Sequelize.fn('SUM',
    //             Sequelize.literal(`
    //                 CASE ${sistemaData.kardex_operaciones.map(t => `WHEN kardexes.tipo = ${t.id} THEN kardexes.cantidad * ${t.operacion}`).join(' ')}
    //                 ELSE 0 END
    //                 `)
    //         ), 0
    //     ),
    //     'cantidad'
    // ],
    // articulo_stock: [Sequelize.literal(`(
    //         SELECT COALESCE(SUM(k.stock), 0)
    //         FROM kardexes AS k
    //         WHERE k.articulo = articulos.id AND k.is_lote_padre = TRUE
    //     )`),
    //     'stock'
    // ],
    // productos_terminados: [
    //     Sequelize.literal(`(
    //         SELECT COALESCE(SUM(k.cantidad), 0)
    //         FROM kardexes AS k
    //         WHERE k.produccion_orden = produccion_ordenes.id AND k.tipo = 4
    //     )`),
    //     'productos_terminados'
    // ],
}

export class Repository {
    constructor(modelId) {
        this.model = models[modelId]
    }

    async find(qry, tojson = false) {
        const columns = Object.keys(this.model.getAttributes())

        const findProps = {
            include: [],
            attributes: ['id'],
            where: {},
            order: [['createdAt', 'DESC']],
        }

        if (qry?.incl) {
            for (const a of qry.incl) {
                findProps.include.push({
                    ...include1[a],
                    attributes: include1[a].attributes ? [...include1[a].attributes] : undefined,
                    include: [],
                })
            }
        }

        if (qry?.iccl) {
            for (const [key, val] of Object.entries(qry.iccl)) {
                const item = findProps.include.find((b) => b.as === key)
                if (item) {
                    if (val.incl) {
                        for (const a of val.incl) {
                            item.include.push({ ...include1[a] })
                        }
                    }

                    if (val.cols) {
                        item.attributes.push(...val.cols)
                    }
                }
            }
        }

        if (qry?.cols) {
            if (qry.cols.exclude) {
                findProps.attributes = { exclude: qry.cols.exclude }
            } else {
                const cols1 = qry.cols.filter((a) => columns.includes(a))
                findProps.attributes.push(...cols1)
            }
        }

        if (qry?.sqls) {
            for (const a of qry.sqls) {
                findProps.attributes.push(sqls1[a])
            }
        }

        if (qry?.fltr) {
            const fltr1 = Object.fromEntries(
                Object.entries(qry.fltr).filter(([key]) => columns.includes(key)),
            )
            Object.assign(findProps.where, applyFilters(fltr1))

            // Filtros de relaciones
            Object.entries(qry.fltr)
                .filter(([k]) => Object.keys(include1).some((pref) => k.startsWith(pref)))
                .forEach(([k, v]) =>
                    Object.assign(findProps.where, applyFilters({ [`$${k}$`]: v })),
                )
        }

        if (qry?.grop) {
            findProps.group = qry.grop
        }

        if (qry?.ordr) {
            findProps.order = qry.ordr
        }

        if (qry?.id) {
            delete findProps.attributes
            const data = await this.model.findByPk(qry.id, findProps)

            if (tojson) {
                return data.toJSON()
            } else {
                return data
            }
        } else {
            const data = await this.model.findAll(findProps)

            if (tojson) {
                return data.map((a) => a.toJSON())
            } else {
                return data
            }
        }
    }

    async existe(where, res, ms) {
        if (where.id) {
            where.id = { [Op.not]: where.id }
        }

        const result = await this.model.findAll({ where })

        if (result.length > 0) {
            res.json({ code: 1, msg: ms ? ms : 'El nombre ya existe' })
            return true
        }
    }

    async create(data, transaction) {
        return await this.model.create(data, { transaction })
    }

    async update(where, data, transaction) {
        const [affectedRows] = await this.model.update(data, { where, transaction })

        if (affectedRows == 0) {
            // if (res) res.json({ code: 1, msg: 'No se actualizó ningún registro' })
            return false
        } else {
            return true
        }
    }

    async delete(where, transaction) {
        const deletedCount = await this.model.destroy({ where, transaction })
        // console.log('Cantidad de eliminados', deletedCount)
        if (deletedCount == 0) {
            // res.json({ code: 1, msg: 'No se eliminó ningún registro' })
            return false
        } else {
            return true
        }
    }

    async createBulk(data, transaction) {
        await this.model.bulkCreate(data, { transaction })
    }
}
