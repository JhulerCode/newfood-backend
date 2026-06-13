import {
    generateSucursalPrinterToken,
    createFailedJobForSucursal,
    getSanitizedSucursal,
    getJobForSucursal,
    listJobsForUser,
    listPendingJobs,
    markSucursalPrinterOnline,
    retryJobForUser,
    updateJobStatus,
    updateSucursalPrinterConfig,
} from './sPrinter.js'
import { requestSucursalPrinters } from '#infrastructure/socket.js'

const generateToken = async (req, res) => {
    try {
        const data = await generateSucursalPrinterToken({
            empresa: req.user.empresa,
            sucursalId: req.params.id,
        })
        if (!data) return res.status(404).json({ code: 1, msg: 'Sucursal no encontrada' })

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const activate = async (req, res) => {
    try {
        const sucursal = req.printerSucursal
        await markSucursalPrinterOnline(sucursal, req.body?.app_version)
        const data = await getSanitizedSucursal(sucursal.id)

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const listSucursalPrinters = async (req, res) => {
    try {
        const data = await requestSucursalPrinters(req.params.id)
        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const pendingJobs = async (req, res) => {
    try {
        const data = await listPendingJobs(req.printerSucursal)
        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}




const findJob = async (req, res) => {
    try {
        const data = await getJobForSucursal(req.printerSucursal, req.params.id)
        if (!data) return res.status(404).json({ code: 1, msg: 'Trabajo no encontrado' })

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const patchJobStatus = async (req, res) => {
    try {
        const data = await updateJobStatus(req.printerSucursal, req.params.id, req.body || {})
        if (!data) return res.status(404).json({ code: 1, msg: 'Trabajo no encontrado' })

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const createFailedJob = async (req, res) => {
    try {
        const data = await createFailedJobForSucursal(req.printerSucursal, req.body || {})
        if (!data) return res.status(404).json({ code: 1, msg: 'Trabajo no encontrado' })

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const updateSucursalConfig = async (req, res) => {
    try {
        const data = await updateSucursalPrinterConfig({
            empresa: req.user.empresa,
            sucursalId: req.params.id,
            body: req.body || {},
        })
        if (!data) return res.status(404).json({ code: 1, msg: 'Sucursal no encontrada' })

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const listJobs = async (req, res) => {
    try {
        const data = await listJobsForUser({
            empresa: req.user.empresa,
            sucursal: req.query.sucursal,
            status: req.query.status,
        })

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const retryJob = async (req, res) => {
    try {
        const data = await retryJobForUser({ empresa: req.user.empresa, id: req.params.id })
        if (!data) return res.status(404).json({ code: 1, msg: 'Trabajo no encontrado' })

        try {
            const { getIO } = await import('#infrastructure/socket.js')
            getIO().to(`printer:${data.sucursal}`).emit('print_job:created', {
                job: { ...data, persisted: true },
            })
        } catch (error) {
            console.log('No se pudo notificar el reintento al agente de impresion', error.message)
        }

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

export default {
    activate,
    pendingJobs,
    findJob,
    patchJobStatus,
    generateToken,
    updateSucursalConfig,
    listSucursalPrinters,
    listJobs,
    retryJob,
    createFailedJob,
}
