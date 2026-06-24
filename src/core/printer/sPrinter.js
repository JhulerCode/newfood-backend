import crypto from 'crypto'
import {
    ImpresionAreaRepository,
    PrinterJobRepository,
    SucursalRepository,
} from '#db/repositories.js'
import { obtenerEmpresa } from '#store/empresas.js'
import { actualizarSucursal, guardarSucursal, obtenerSucursal } from '#store/sucursales.js'

const TOKEN_PREFIX = 'dvr_prn'
const ENGINE = 'sumatra-pdf'
const CASH_PRINTER_JOB_TYPES = new Set(['precuenta', 'comprobante', 'caja_resumen'])

function hashPrinterToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex')
}

function createPlainPrinterToken() {
    return `${TOKEN_PREFIX}_${crypto.randomBytes(32).toString('hex')}`
}

export async function loadSucursalImpresoraCaja(sucursalId) {
    if (!sucursalId) return null

    let sucursal = obtenerSucursal(sucursalId)
    if (sucursal && sucursal.impresora_caja !== undefined) {
        return sucursal.impresora_caja
    }

    if (!sucursal) {
        const data = await SucursalRepository.find({ id: sucursalId }, true)
        if (!data) return null
        sucursal = guardarSucursal(sucursalId, data)
    }

    const areas = await ImpresionAreaRepository.find(
        {
            fltr: {
                nombre: { op: 'Es', val: 'CAJA' },
                sucursal: { op: 'Es', val: sucursalId },
            },
            cols: ['impresora_tipo', 'impresora', 'impresora_display_name'],
        },
        true,
    )
    const impresora_caja = areas[0] || null

    actualizarSucursal(sucursalId, { impresora_caja })
    return impresora_caja
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

export async function deleteSucursalPrinterToken({ empresa, sucursalId }) {
    const sucursal = await SucursalRepository.find({ id: sucursalId }, true)
    if (!sucursal || sucursal.empresa !== empresa) return null

    const patch = {
        printer_token_hash: null,
        printer_agent_enabled: false,
        printer_status: 'offline',
        printer_app_version: null,
        printer_last_seen_at: null,
    }

    await SucursalRepository.update({ id: sucursalId }, patch)

    const safeSucursal = await getSanitizedSucursal(sucursalId)
    guardarSucursal(sucursalId, safeSucursal)
    const storePatch = { ...patch }
    delete storePatch.printer_token_hash
    actualizarSucursal(sucursalId, { ...storePatch, empresa: safeSucursal.empresa })

    return safeSucursal
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
    actualizarSucursal(sucursal.id, { ...patch, empresa: sucursal.empresa })
}

export async function getSanitizedSucursal(id) {
    const sucursal = await SucursalRepository.find({ id, incl: ['empresa1'] }, true)
    if (!sucursal) return null
    const { printer_token_hash, ...safeSucursal } = sucursal
    return safeSucursal
}

export async function listPendingJobs(sucursal) {
    const jobs = await PrinterJobRepository.find(
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

    return jobs.map((job) => ({ ...job, persisted: true }))
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

    const sucursal = obtenerSucursal(sucursalId)
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

    const area = getCachedPrinterArea(sucursal, printerArea)
    const printer_name = CASH_PRINTER_JOB_TYPES.has(type) ? getPrinterDisplayName(area) : null

    const job = {
        id: crypto.randomUUID(),
        type,
        source_event: event,
        payload: buildPrintJobPayload(type, data, sucursal),
        colaborador: colaborador || {},
        printer_area: printerArea,
        printer_name: type === 'comanda' ? null : printer_name,
        engine: ENGINE,
        status: 'pending',
        attempts: 0,
        empresa: sucursal.empresa,
        sucursal: sucursalId,
        persisted: false,
    }

    return {
        enabled: true,
        job,
        sucursal,
    }
}

function buildPrintJobPayload(type, data, sucursal) {
    const payload = data || {}
    if (type !== 'comprobante') return payload

    const empresa = obtenerEmpresa(payload.empresa || sucursal?.empresa)
    const foto = empresa?.foto
    if (!foto?.url) return payload

    return {
        ...payload,
        empresa_datos: {
            ...(payload.empresa_datos || {}),
            foto,
        },
    }
}

export async function createFailedJobForSucursal(sucursal, body) {
    const job = body?.job || {}
    if (!job.id || job.sucursal !== sucursal.id || job.empresa !== sucursal.empresa) return null

    const matches = await PrinterJobRepository.find(
        {
            fltr: { id: { op: 'Es', val: job.id } },
            cols: ['status'],
        },
        true,
    )
    const exists = matches[0]
    if (exists) return await updateJobStatus(sucursal, job.id, body)

    const data = await PrinterJobRepository.create({
        id: job.id,
        type: job.type,
        source_event: job.source_event,
        payload: job.payload || {},
        colaborador: job.colaborador || {},
        printer_area: job.printer_area,
        printer_name: job.printer_name,
        engine: job.engine || ENGINE,
        status: 'failed',
        attempts: Number(job.attempts || 0) + 1,
        error_message: body.errorMessage || body.error_message || null,
        failed_at: new Date(),
        empresa: job.empresa,
        sucursal: job.sucursal,
    })

    return data.toJSON()
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

    if (status === 'printing') patch.received_at = job.received_at || new Date()
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
    const allowed = ['pending', 'printing', 'printed', 'failed']
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

function getCachedPrinterArea(sucursal, nombre) {
    if (nombre === 'CAJA' && sucursal.impresora_caja) return sucursal.impresora_caja

    return sucursal.impresion_areas?.find((area) => area.nombre === nombre)
}

function getPrinterDisplayName(area) {
    return area?.impresora_display_name?.trim() || null
}
