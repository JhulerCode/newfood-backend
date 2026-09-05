import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import { Op } from 'sequelize'

// Run the real handler with isolated repositories; no production DB connection.
const source = readFileSync(new URL('../src/core/articulos/cArticulos.js', import.meta.url), 'utf8')
const handler = source.slice(source.indexOf('const update = async'), source.indexOf('const delet = async'))

for (const legacyEmpresa of [null, 'company']) {
    test(`editing a combo replaces components with empresa=${legacyEmpresa}`, async () => {
        const transaction = { commit: async () => {}, rollback: async () => assert.fail('unexpected rollback') }
        let rows = [{ articulo_principal: 'combo', articulo_variant: '209', empresa: legacyEmpresa }]
        const unrelated = { articulo_principal: 'other-combo', articulo_variant: '209', empresa: null }
        rows.push(unrelated)
        const context = {
            Op,
            sequelize: { transaction: async () => transaction },
            parseBody: () => {},
            getArticleBarcode: () => null,
            isValidPrice: () => true,
            ArticuloRepository: {
                existe: async () => false,
                update: async (where) => { assert.deepEqual({ ...where }, { id: 'combo', empresa: 'company' }); return true },
            },
            ArticuloVariantRepository: { model: { findAll: async () => [] } },
            buildVariants: () => [],
            validateVariants: async () => true,
            validateRemovedVariants: async () => true,
            syncVariants: async () => {},
            normalizeComboItems: async (items) => items,
            ComboArticuloRepository: {
                delete: async (where, tx) => {
                    assert.equal(tx, transaction)
                    rows = rows.filter(row => !(row.articulo_principal === where.articulo_principal &&
                        (where[Op.or] || [{ empresa: where.empresa }]).some(filter => row.empresa === filter.empresa)))
                },
                createBulk: async (items, tx) => {
                    assert.equal(tx, transaction)
                    for (const item of items) {
                        assert.ok(!rows.some(row => row.articulo_principal === item.articulo_principal && row.articulo_variant === item.articulo_variant), 'duplicate combo component')
                        rows.push(item)
                    }
                },
            },
            loadOne: async () => rows,
        }
        const update = vm.runInNewContext(`${handler}\nupdate`, context)
        let response
        await update({
            user: { empresa: 'company', colaborador: 'user' }, params: { id: 'combo' }, empresa: { sucursales: [] },
            body: { tipo: 2, is_combo: true, precio_venta: 25, combo_articulos: [{ articulo: '209', articulo_variant: '209', cantidad: 1 }] },
        }, { json: value => { response = value }, status: () => assert.fail('unexpected HTTP error') })
        assert.equal(response.code, 0)
        assert.equal(rows.length, 2)
        assert.ok(rows.includes(unrelated))
        assert.equal(rows.find(row => row.articulo_principal === 'combo').empresa, 'company')
    })
}
