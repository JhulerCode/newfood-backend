import dayjs from 'dayjs'

function isExpired(fecha_fin) {
    if (!fecha_fin) return false

    return dayjs().startOf('day').isAfter(dayjs(fecha_fin).startOf('day'))
}

export function validateEmpresaAccess(empresa) {
    if (!empresa) return 'Empresa no encontrada'
    if (empresa.activo === false) return 'Empresa inactiva'

    return null
}

export function validateSucursalAccess(sucursal) {
    if (!sucursal) return 'Sucursal no encontrada'
    if (sucursal.activo === false) return 'Sucursal inactiva'
    if (!sucursal.fecha_fin) return 'Sucursal sin fecha límite de uso'
    if (isExpired(sucursal.fecha_fin)) return 'La fecha límite de uso de la sucursal ha vencido'

    return null
}

export function findAccessibleSucursal(sucursales = []) {
    return sucursales.find((sucursal) => validateSucursalAccess(sucursal) == null) || null
}
