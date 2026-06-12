import crypto from 'crypto'
import {
    ImpresionAreaRepository,
    PrinterJobRepository,
    SucursalRepository,
} from '#db/repositories.js'
import { actualizarSucursal } from '#store/sucursales.js'

const TOKEN_PREFIX = 'dvr_prn'
const ENGINE = 'sumatra-pdf'

function hashPrinterToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex')
}

function createPlainPrinterToken() {
    return `${TOKEN_PREFIX}_${crypto.randomBytes(32).toString('hex')}`
}

export async function generateSucursalPrinterToken({ empresa, sucursalId }) {
    const sucursal = await SucursalRepository.find({ id: sucursalId }, true)
    if (!sucursal || sucursal.empresa !== empresa) return null

    const token = createPlainPrinterToken()
    await SucursalRepository.update(
        { id: sucursalId },
        {
            printer_token_hash: hashPrinterToken(token),
            printer_agent_enabled: true,
            printer_status: 'offline',
        },
    )
    actualizarSucursal(sucursalId, {
        printer_agent_enabled: true,
        printer_status: 'offline',
    })

    return { sucursal: await getSanitizedSucursal(sucursalId), token }
}

export async function verifyPrinterToken(token) {
    if (!token) return null

    const sucursales = await SucursalRepository.find(
        {
            fltr: { printer_token_hash: { op: 'Es', val: hashPrinterToken(token) } },
            cols: [
                'codigo',
                'direccion',
                'printer_agent_enabled',
                'printer_status',
                'printer_app_version',
                'printer_last_seen_at',
                'empresa',
            ],
        },
        true,
    )

    return sucursales[0] || null
}

export async function markSucursalPrinterOnline(sucursal, appVersion) {
    const patch = {
        printer_status: 'online',
        printer_last_seen_at: new Date(),
    }
    if (appVersion) patch.printer_app_version = appVersion

    await SucursalRepository.update({ id: sucursal.id }, patch)
    actualizarSucursal(sucursal.id, patch)
}

export async function getSanitizedSucursal(id) {
    const sucursal = await SucursalRepository.find({ id, incl: ['empresa1'] }, true)
    if (!sucursal) return null
    const { printer_token_hash, ...safeSucursal } = sucursal
    return safeSucursal
}

export async function listPendingJobs(sucursal) {
    return await PrinterJobRepository.find(
        {
            fltr: {
                sucursal: { op: 'Es', val: sucursal.id },
                status: { op: 'Es', val: 'pending' },
            },
            cols: [
                'type',
                'source_event',
                'printer_area',
                'printer_name',
                'engine',
                'status',
                'attempts',
                'createdAt',
            ],
        },
        true,
    )
}

export async function createSocketPrintJob({
    event,
    type,
    data,
    colaborador,
    printerArea = 'CAJA',
}) {
    const sucursalId = data?.sucursal
    if (!sucursalId) {
        return {
            enabled: false,
            reason: 'missing_sucursal',
            job: null,
        }
    }

    const sucursal = await SucursalRepository.find({ id: sucursalId }, true)
    if (!sucursal) {
        return {
            enabled: false,
            reason: 'sucursal_not_found',
            job: null,
        }
    }

    if (!sucursal.printer_agent_enabled) {
        return {
            enabled: false,
            reason: 'printer_agent_disabled',
            job: null,
            sucursal,
        }
    }

    const payload_printer_name = data?.impresora?.impresora || data?.impresion_area?.impresora
    const area = payload_printer_name ? null : await findArea(sucursalId, printerArea)
    const job = await PrinterJobRepository.create({
        type,
        source_event: event,
        payload: data || {},
        colaborador: colaborador || {},
        printer_area: printerArea,
        printer_name: payload_printer_name || area?.impresora || null,
        engine: ENGINE,
        status: 'pending',
        attempts: 0,
        empresa: sucursal.empresa,
        sucursal: sucursalId,
    })

    return {
        enabled: true,
        job: job.toJSON(),
        sucursal,
    }
}




export async function updateSucursalPrinterConfig({ empresa, sucursalId, body }) {
    const sucursal = await SucursalRepository.find({ id: sucursalId }, true)
    if (!sucursal || sucursal.empresa !== empresa) return null

    await SucursalRepository.update(
        { id: sucursalId },
        {
            printer_agent_enabled:
                typeof body.printer_agent_enabled === 'boolean'
                    ? body.printer_agent_enabled
                    : sucursal.printer_agent_enabled,
        },
    )
    actualizarSucursal(sucursalId, {
        printer_agent_enabled:
            typeof body.printer_agent_enabled === 'boolean'
                ? body.printer_agent_enabled
                : sucursal.printer_agent_enabled,
    })

    return await getSanitizedSucursal(sucursalId)
}

export async function markSucursalPrinterOffline(sucursalId) {
    if (!sucursalId) return
    await SucursalRepository.update({ id: sucursalId }, { printer_status: 'offline' })
    actualizarSucursal(sucursalId, { printer_status: 'offline' })
}

export async function getJobForSucursal(sucursal, id) {
    const job = await PrinterJobRepository.find({ id }, true)
    if (!job || job.sucursal !== sucursal.id || job.empresa !== sucursal.empresa) return null
    return job
}

export async function updateJobStatus(sucursal, id, body) {
    const job = await getJobForSucursal(sucursal, id)
    if (!job) return null

    const status = normalizeJobStatus(body.status)
    const patch = {
        status,
        error_message: body.errorMessage || body.error_message || null,
    }

    if (status === 'received' || status === 'printing')
        patch.received_at = job.received_at || new Date()
    if (status === 'printed') patch.printed_at = new Date()
    if (status === 'failed') {
        patch.failed_at = new Date()
        patch.attempts = Number(job.attempts || 0) + 1
    }

    await PrinterJobRepository.update({ id }, patch)
    return await PrinterJobRepository.find({ id }, true)
}

export async function listJobsForUser({ empresa, sucursal, status }) {
    const fltr = {
        empresa: { op: 'Es', val: empresa },
    }
    if (sucursal) fltr.sucursal = { op: 'Es', val: sucursal }
    if (status) fltr.status = { op: 'Es', val: status }

    return await PrinterJobRepository.find(
        {
            fltr,
            cols: [
                'type',
                'source_event',
                'printer_area',
                'printer_name',
                'engine',
                'status',
                'attempts',
                'error_message',
                'sucursal',
                'empresa',
                'createdAt',
                'updatedAt',
            ],
        },
        true,
    )
}

export async function retryJobForUser({ empresa, id }) {
    const job = await PrinterJobRepository.find({ id }, true)
    if (!job || job.empresa !== empresa) return null

    await PrinterJobRepository.update(
        { id },
        {
            status: 'pending',
            error_message: null,
            received_at: null,
            printed_at: null,
            failed_at: null,
        },
    )

    return await PrinterJobRepository.find({ id }, true)
}

export async function getSucursalAreas(sucursal) {
    return await ImpresionAreaRepository.find(
        {
            fltr: {
                sucursal: { op: 'Es', val: sucursal },
                activo: { op: 'Es', val: true },
            },
            cols: [
                'nombre',
                'impresora_tipo',
                'impresora',
                'impresora_display_name',
                'impresora_config',
                'sucursal',
                'empresa',
            ],
        },
        true,
    )
}

function normalizeJobStatus(status) {
    const allowed = ['pending', 'received', 'printing', 'printed', 'failed']
    return allowed.includes(status) ? status : 'failed'
}

async function findArea(sucursal, nombre) {
    const areas = await ImpresionAreaRepository.find(
        {
            fltr: {
                sucursal: { op: 'Es', val: sucursal },
                nombre: { op: 'Es', val: nombre },
            },
            cols: ['nombre', 'impresora_tipo', 'impresora', 'impresora_display_name'],
        },
        true,
    )
    return areas[0]
}
