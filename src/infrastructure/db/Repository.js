import { Op, literal } from 'sequelize'
import { Articulo } from '#db/models/Articulo.js'
import { ArticuloVariant } from '#db/models/ArticuloVariant.js'
import { ArticuloCategoria } from '#db/models/ArticuloCategoria.js'
import { CajaApertura } from '#db/models/CajaApertura.js'
import { Colaborador } from '#db/models/Colaborador.js'
import { ComboArticulo } from '#db/models/ComboArticulo.js'
import { Comprobante, ComprobanteItem } from '#db/models/Comprobante.js'
import { ComprobanteTipo } from '#db/models/ComprobanteTipo.js'
import { DineroMovimiento } from '#db/models/DineroMovimiento.js'
import { Empresa } from '#db/models/Empresa.js'
import { Kardex } from '#db/models/Kardex.js'
import { Mesa } from '#db/models/Mesa.js'
import { PagoMetodo } from '#db/models/PagoMetodo.js'
import { PrinterJob } from '#db/models/PrinterJob.js'
import { ImpresionArea } from '#db/models/ImpresionArea.js'
import { RecetaInsumo } from '#db/models/RecetaInsumo.js'
import { Salon } from '#db/models/Salon.js'
import { Socio } from '#db/models/Socio.js'
import { Sucursal } from '#db/models/Sucursal.js'
import { SucursalArticulo } from '#db/models/SucursalArticulo.js'
import { SucursalArticuloVariant } from '#db/models/SucursalArticuloVariant.js'
import { SucursalComprobanteTipo } from '#db/models/SucursalComprobanteTipo.js'
import { SucursalPagoMetodo } from '#db/models/SucursalPagoMetodo.js'
import { Transaccion, TransaccionItem } from '#db/models/Transaccion.js'

import { applyFilters } from '#db/helpers.js'
import { sistemaData } from '#store/system.js'

export const models = {
    Articulo,
    ArticuloVariant,
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
    PrinterJob,
    ImpresionArea,
    RecetaInsumo,
    Salon,
    Socio,
    Sucursal,
    SucursalArticulo,
    SucursalArticuloVariant,
    SucursalComprobanteTipo,
    SucursalPagoMetodo,
    Transaccion,
    TransaccionItem,
}

const include1 = {
    articulo_variants: {
        model: ArticuloVariant,
        as: 'articulo_variants',
        separate: true,
        order: [['createdAt', 'ASC']],
        attributes: [
            'id',
            'articulo',
            'nombre',
            'sku',
            'codigo_barras',
            'price',
            'activo',
        ],
    },
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
    articulo_variant1: {
        model: ArticuloVariant,
        as: 'articulo_variant1',
        attributes: [
            'id',
            'articulo',
            'nombre',
            'sku',
            'codigo_barras',
            'price',
            'activo',
        ],
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
        attributes: ['id', 'articulo_principal', 'articulo', 'articulo_variant', 'cantidad', 'orden'],
    },
    comprobante1: {
        model: Comprobante,
        as: 'comprobante1',
        attributes: [
            'id',
            'fecha_emision',
            'doc_tipo',
            'serie',
            'numero',
            'serie_correlativo',
            'monto',
            'estado',
        ],
    },
    comprobante_tipo1: {
        model: ComprobanteTipo,
        as: 'comprobante_tipo1',
        attributes: ['id', 'serie'],
    },
    comprobante_items: {
        model: ComprobanteItem,
        as: 'comprobante_items',
        attributes: [
            'id',
            'articulo',
            'articulo_variant',
            'descripcion',
            'pu',
            'descuento_tipo',
            'descuento_valor',
            'cantidad',
            'igv_porcentaje',
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
    doc_tipo1: {
        model: ComprobanteTipo,
        as: 'doc_tipo1',
        attributes: ['id', 'tipo', 'serie', 'tipo_serie', 'tipo1'],
    },
    empresa1: {
        model: Empresa,
        as: 'empresa1',
        attributes: ['id', 'razon_social'],
    },
    impresion_areas: {
        model: ImpresionArea,
        as: 'impresion_areas',
        attributes: ['id', 'impresora_tipo', 'impresora', 'impresora_display_name', 'nombre'],
    },
    impresion_area1: {
        model: ImpresionArea,
        as: 'impresion_area1',
        attributes: ['id', 'impresora_tipo', 'impresora', 'impresora_display_name', 'nombre'],
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
        model: ImpresionArea,
        as: 'produccion_area1',
        attributes: ['id', 'impresora_tipo', 'impresora', 'nombre'],
    },
    receta_insumos: {
        model: RecetaInsumo,
        as: 'receta_insumos',
        attributes: [
            'id',
            'articulo_principal',
            'articulo_principal_variant',
            'articulo',
            'articulo_variant',
            'cantidad',
            'orden',
        ],
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
    sucursal1: {
        model: Sucursal,
        as: 'sucursal1',
        attributes: ['id', 'codigo'],
    },
    sucursales: {
        model: Sucursal,
        as: 'sucursales',
        attributes: ['id', 'codigo', 'activo', 'fecha_fin', 'empresa'],
    },
    sucursal_articulos: {
        model: SucursalArticulo,
        as: 'sucursal_articulos',
        attributes: ['id', 'sucursal', 'estado', 'impresion_area'],
    },
    sucursal_articulo_variants: {
        model: SucursalArticuloVariant,
        as: 'sucursal_articulo_variants',
        separate: true,
        attributes: ['id', 'sucursal', 'articulo', 'articulo_variant', 'estado'],
    },
    sucursal_comprobante_tipos: {
        model: SucursalComprobanteTipo,
        as: 'sucursal_comprobante_tipos',
        attributes: ['id', 'estado'],
    },
    sucursal_pago_metodos: {
        model: SucursalPagoMetodo,
        as: 'sucursal_pago_metodos',
        attributes: ['id', 'estado'],
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
    venta_pago_metodo1: {
        model: PagoMetodo,
        as: 'venta_pago_metodo1',
        attributes: ['id', 'nombre'],
    },
}

function requireSqlContext({ sequelize, sucursal, tableAlias }) {
    if (!sequelize) throw new Error('No se pudo preparar la consulta SQL calculada')
    if (sucursal === undefined || sucursal === null || sucursal === '') {
        throw new Error('Se requiere una sucursal para calcular el stock')
    }

    return {
        sucursal: sequelize.escape(sucursal),
        tableAlias: tableAlias || 'articulo_variants',
    }
}

function kardexOperationCase(sequelize, kardexAlias = 'k') {
    return sistemaData.kardex_operaciones
        .map(
            (operation) =>
                `WHEN ${kardexAlias}.tipo = ${sequelize.escape(operation.id)} THEN ${Number(operation.operacion)}`,
        )
        .join(' ')
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
    comprobante_pagos_monto: [
        literal(
            `(SELECT COALESCE(SUM(c.monto), 0) FROM dinero_movimientos AS c WHERE c.comprobante = "comprobantes"."id")`,
        ),
        'comprobante_pagos_monto',
    ],
    articulo_variant_stock: (context) => {
        const { sequelize } = context
        const { sucursal, tableAlias } = requireSqlContext(context)
        const operationCase = kardexOperationCase(sequelize)

        return [
            literal(`(
                SELECT COALESCE(SUM(
                    k.cantidad::numeric * (
                        CASE ${operationCase} ELSE 0 END
                    )
                ), 0)
                FROM kardexes AS k
                WHERE k.articulo_variant = "${tableAlias}"."id"
                    AND k.sucursal = ${sucursal}
                    AND k.empresa = "${tableAlias}"."empresa"
            )`),
            'articulo_variant_stock',
        ]
    },
    articulo_variant_stock_valorizado: (context) => {
        const { sequelize } = context
        const { sucursal, tableAlias } = requireSqlContext(context)
        const operationCase = kardexOperationCase(sequelize)

        return [
            literal(`(
                SELECT
                    GREATEST(COALESCE(SUM(
                        k.cantidad::numeric * (
                            CASE ${operationCase} ELSE 0 END
                        )
                    ), 0), 0)
                    * COALESCE((
                        SELECT ti.pu::numeric
                        FROM kardexes AS ultima_compra
                        INNER JOIN transaccion_items AS ti
                            ON ti.id = ultima_compra.transaccion_item
                        WHERE ultima_compra.articulo_variant = "${tableAlias}"."id"
                            AND ultima_compra.sucursal = ${sucursal}
                            AND ultima_compra.empresa = "${tableAlias}"."empresa"
                            AND ultima_compra.tipo = 1
                            AND ti.pu IS NOT NULL
                        ORDER BY
                            ultima_compra.fecha DESC,
                            ultima_compra."createdAt" DESC,
                            ultima_compra.id DESC
                        LIMIT 1
                    ), 0)
                FROM kardexes AS k
                WHERE k.articulo_variant = "${tableAlias}"."id"
                    AND k.sucursal = ${sucursal}
                    AND k.empresa = "${tableAlias}"."empresa"
            )`),
            'articulo_variant_stock_valorizado',
        ]
    },
}

export function getSqlAttribute(name, context = {}) {
    const sql = sqls1[name]
    if (!sql) throw new Error(`Consulta SQL calculada no registrada: ${name}`)
    return typeof sql === 'function' ? sql(context) : sql
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
                        if (val.cols.exclude) {
                            item.attributes = { exclude: val.cols.exclude }
                        } else {
                            item.attributes.push(...val.cols)
                        }
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
                findProps.attributes.push(
                    getSqlAttribute(a, {
                        sequelize: this.model.sequelize,
                        sucursal: qry.sucursal || qry.sql_params?.sucursal,
                        tableAlias: this.model.tableName,
                    }),
                )
            }
        }

        if (qry?.fltr) {
            const fltr1 = Object.fromEntries(
                Object.entries(qry.fltr).filter(([key]) => columns.includes(key)),
            )
            // --- Manejo de or --- //
            if (qry.fltr.or) fltr1.or = qry.fltr.or
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
            // delete findProps.attributes
            findProps.attributes.push(...columns)

            const data = await this.model.findByPk(qry.id, findProps)

            if (tojson) {
                return data ? data.toJSON() : null
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

        const result = await this.model.findAll({ where, attributes: ['id'] })

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
