import { SucursalRepository } from '#db/repositories.js'
import { guardarSucursal } from '#store/sucursales.js'
import { shouldDeactivateSucursal } from '#shared/tenantAccess.js'

const INTERVAL_MS = 60 * 60 * 1000

export async function deactivateExpiredSucursales() {
    const sucursales = await SucursalRepository.find(
        {
            fltr: {
                activo: { op: 'Es', val: true },
            },
            cols: ['codigo', 'activo', 'fecha_fin', 'empresa'],
        },
        true,
    )

    let updated = 0
    for (const sucursal of sucursales) {
        if (!shouldDeactivateSucursal(sucursal)) continue

        await SucursalRepository.update({ id: sucursal.id }, { activo: false })
        await guardarSucursal(sucursal.id, { ...sucursal, activo: false })
        updated++
    }

    if (updated > 0) console.log(`Sucursales vencidas desactivadas: ${updated}`)
}

export function initSucursalAccessScheduler() {
    deactivateExpiredSucursales().catch((error) => {
        console.error('Error desactivando sucursales vencidas:', error)
    })

    setInterval(() => {
        deactivateExpiredSucursales().catch((error) => {
            console.error('Error desactivando sucursales vencidas:', error)
        })
    }, INTERVAL_MS)
}
