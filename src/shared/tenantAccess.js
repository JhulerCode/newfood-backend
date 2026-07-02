import dayjs from '#shared/dayjs.js'

function getDay(fecha) {
    const value = typeof fecha === 'string' ? fecha.slice(0, 10) : dayjs(fecha).format('YYYY-MM-DD')
    return dayjs.tz(value, 'America/Lima').startOf('day')
}

function getToday() {
    return dayjs().tz('America/Lima').startOf('day')
}

function getDayDiff(fecha_fin) {
    return getDay(fecha_fin).diff(getToday(), 'day')
}

function formatFecha(fecha_fin) {
    return getDay(fecha_fin).format('DD/MM/YYYY')
}

export function validateEmpresaAccess(empresa) {
    if (!empresa) return 'Empresa no encontrada'
    if (empresa.activo === false) return 'Empresa inactiva'

    return null
}

export function validateSucursalAccess(sucursal) {
    if (!sucursal) return 'Sucursal no encontrada'
    if (sucursal.activo === false) return 'Sucursal inactiva'
    if (!sucursal.fecha_fin) return 'Sucursal sin fecha limite de licencia'
    if (getDayDiff(sucursal.fecha_fin) <= -3)
        return 'La sucursal superó la fecha limite de licencia'

    return null
}

export function findAccessibleSucursal(sucursales = []) {
    return sucursales.find((sucursal) => validateSucursalAccess(sucursal) == null) || null
}

export function shouldDeactivateSucursal(sucursal) {
    if (!sucursal?.fecha_fin || sucursal.activo === false) return false

    return getDayDiff(sucursal.fecha_fin) <= -3
}

export function getSucursalAccessNotice(sucursal) {
    if (!sucursal?.fecha_fin) return null

    const dias = getDayDiff(sucursal.fecha_fin)
    const fecha = formatFecha(sucursal.fecha_fin)

    if (dias > 5) return null

    if (dias > 0) {
        return {
            icon: 'warning',
            title: 'Licencia de uso proximo a vencer',
            text: `Podra usar el sistema hasta el ${fecha}. Faltan ${dias} dia${dias == 1 ? '' : 's'}; regularice el pago para evitar la suspension.`,
        }
    }

    if (dias == 0) {
        return {
            icon: 'warning',
            title: 'La licencia de uso vence hoy',
            text: `Podra usar el sistema solo hasta hoy, ${fecha}. Regularice el pago para evitar la suspension.`,
        }
    }

    const dias_vencidos = Math.abs(dias)
    const dias_restantes = Math.max(3 - dias_vencidos, 0)

    if (dias_restantes == 0) return null

    return {
        icon: 'error',
        title: 'Licencia de uso vencida',
        text: `Su licencia de uso venció el ${fecha}. El servicio se cortará en ${dias_restantes} día${dias_restantes == 1 ? '' : 's'} si no regulariza el pago.`,
    }
}
