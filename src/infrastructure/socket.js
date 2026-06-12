import { Server } from 'socket.io'
import { obtenerEmpresa, guardarEmpresa } from '#store/empresas.js'
import {
    sucursalesStore,
    obtenerSucursal,
    guardarSucursal,
    actualizarSucursal,
} from '#store/sucursales.js'
import {
    ImpresionAreaRepository,
    EmpresaRepository,
    SucursalRepository,
    SocioRepository,
} from '#db/repositories.js'
import {
    createSocketPrintJob,
    markSucursalPrinterOffline,
    markSucursalPrinterOnline,
    verifyPrinterToken,
} from '#core/printer/sPrinter.js'

let io = null
const socketUsers = {}
const printerSockets = {}

async function loadSucursalImpresoraCaja(sucursal) {
    const qry = {
        fltr: {
            nombre: { op: 'Es', val: 'CAJA' },
            sucursal: { op: 'Es', val: sucursal },
        },
        cols: ['impresora_tipo', 'impresora'],
    }
    const impresion_areas = await ImpresionAreaRepository.find(qry, true)
    return impresion_areas[0]
}

export function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: '*',
        },
        pingInterval: 25000,
        pingTimeout: 120000,
        allowEIO3: true,
    })

    io.on('connection', (socket) => {
        socket.on('printer:join', async (data = {}) => {
            try {
                const sucursal = await verifyPrinterToken(data.token)
                if (!sucursal) {
                    socket.emit('printer:auth_failed')
                    return
                }

                if (!sucursal.printer_agent_enabled) {
                    socket.emit('printer:disabled')
                    console.log('SocketIO: printer join rejected; agent disabled', {
                        sucursal: sucursal.id,
                    })
                    return
                }

                await markSucursalPrinterOnline(sucursal, data.appVersion)
                socket.join(`printer:${sucursal.id}`)
                socket.data.printerSucursal = sucursal.id
                printerSockets[sucursal.id] = socket.id

                socket.emit('printer:ready')
                socket.emit('printer:heartbeat', { at: new Date().toISOString() })
                console.log('SocketIO: printer online', {
                    sucursal: sucursal.id,
                    socket_id: socket.id,
                })
            } catch (error) {
                socket.emit('printer:auth_failed')
                console.log('SocketIO: printer join error', error.message)
            }
        })

        socket.on('printer:heartbeat', async () => {
            if (!socket.data.printerSucursal) return
            await markSucursalPrinterOnline(
                {
                    id: socket.data.printerSucursal,
                },
                null,
            )
        })

        socket.on('joinPcPrincipal', async (colaborador) => {
            let empresa = obtenerEmpresa(colaborador.empresa)

            if (!empresa) {
                const qry = {
                    id: colaborador.empresa,
                    incl: ['sucursales'],
                }

                empresa = await EmpresaRepository.find(qry, true)
                empresa.clientes_varios = await loadEmpresaClienteVarios(empresa.id)
                guardarEmpresa(colaborador.empresa, empresa)

                for (const a of empresa.sucursales) guardarSucursal(a.id, a)
            }

            if (empresa) {
                const to_save = {
                    ...colaborador,
                    empresa_nombre: empresa.razon_social,
                    sucursal_codigo: empresa.sucursales.find((s) => s.id == colaborador.sucursal)
                        ?.codigo,
                    socket_id: socket.id,
                }
                consoleLogSocket(to_save, '🟢 Usuario conectado')

                socket.join(colaborador.sucursal)
                socketUsers[socket.id] = to_save
            } else {
                console.log(`🔴 Usuario no conectado | Empresa: ${colaborador.empresa}`)
            }
        })

        socket.on('joinUser', async (colaborador) => {
            const empresa = obtenerEmpresa(colaborador.empresa)

            if (empresa) {
                const to_save = {
                    ...colaborador,
                    empresa_nombre: empresa.razon_social,
                    sucursal_codigo: empresa.sucursales.find((s) => s.id == colaborador.sucursal)
                        ?.codigo,
                    socket_id: socket.id,
                }
                consoleLogSocket(to_save, '🟢 Usuario conectado')

                socket.join(colaborador.sucursal)
                socketUsers[socket.id] = to_save

                // --- GUARDAR IMPRESORA CAJA EN LA SUCURSAL --- //
                let sucursal = obtenerSucursal(colaborador.sucursal)

                if (!sucursal) {
                    if (colaborador.sucursal) {
                        sucursal = await SucursalRepository.find({ id: colaborador.sucursal }, true)
                        sucursal = guardarSucursal(colaborador.sucursal, sucursal)
                    }
                }

                if (sucursal && !sucursal.impresora_caja) {
                    const impresora_caja = await loadSucursalImpresoraCaja(colaborador.sucursal)
                    actualizarSucursal(colaborador.sucursal, { impresora_caja })
                }
            } else {
                console.log(`🔴 Usuario no conectado | Empresa: ${colaborador.empresa}`)
            }
        })

        // --- Pedidos --- //
        socket.on('vComanda:crear', (data) => {
            const socket_user = socketUsers[socket.id]
            consoleLogSocket(socket_user, 'vComanda:crear')
            io.to(socket_user.sucursal).emit('vComanda:crear', data)
        })

        socket.on('vComanda:editar', (data) => {
            const socket_user = socketUsers[socket.id]
            consoleLogSocket(socket_user, 'vComanda:editar')
            io.to(socket_user.sucursal).emit('vComanda:editar', data)
        })

        socket.on('vComanda:addProductos', (data) => {
            const socket_user = socketUsers[socket.id]
            consoleLogSocket(socket_user, 'vComanda:addProductos')
            io.to(socket_user.sucursal).emit('vComanda:addProductos', data)
        })

        socket.on('mPedidoDetalles:modificar', (data) => {
            const socket_user = socketUsers[socket.id]
            consoleLogSocket(socket_user, 'mPedidoDetalles:modificar')
            io.to(socket_user.sucursal).emit('mPedidoDetalles:modificar', data)
        })

        socket.on('vPedidos:eliminar', (data) => {
            const socket_user = socketUsers[socket.id]
            consoleLogSocket(socket_user, 'vPedidos:eliminar')
            io.to(socket_user.sucursal).emit('vPedidos:eliminar', data)
        })

        socket.on('vPedidos:anular', (data) => {
            const socket_user = socketUsers[socket.id]
            consoleLogSocket(socket_user, 'vPedidos:anular')
            io.to(socket_user.sucursal).emit('vPedidos:anular', data)
        })

        socket.on('vPedidos:entregar', (data) => {
            const socket_user = socketUsers[socket.id]
            consoleLogSocket(socket_user, 'vPedidos:entregar')
            io.to(socket_user.sucursal).emit('vPedidos:entregar', data)
        })

        socket.on('vPedidos:entregarBulk', (data) => {
            const socket_user = socketUsers[socket.id]
            consoleLogSocket(socket_user, 'vPedidos:entregarBulk')
            io.to(socket_user.sucursal).emit('vPedidos:entregarBulk', data)
        })

        socket.on('mCambiarMesa:cambiar', (data) => {
            const socket_user = socketUsers[socket.id]
            consoleLogSocket(socket_user, 'mCambiarMesa:cambiar')
            io.to(socket_user.sucursal).emit('mCambiarMesa:cambiar', data)
        })

        socket.on('mMesasUnir:unir', () => {
            const socket_user = socketUsers[socket.id]
            consoleLogSocket(socket_user, 'mMesasUnir:unir')
            io.to(socket_user.sucursal).emit('mMesasUnir:unir')
        })

        socket.on('vEmitirComprobante:grabar', (data) => {
            const socket_user = socketUsers[socket.id]
            consoleLogSocket(socket_user, 'vEmitirComprobante:grabar')
            io.to(socket_user.sucursal).emit('vEmitirComprobante:grabar', data)
        })

        socket.on('vComanda:imprimir', async (data) => {
            const socket_user = socketUsers[socket.id]
            consoleLogSocket(socket_user, 'vComanda:imprimir')

            const handledBySucursalPrinter = await handleSucursalPrinterJob({
                event: 'vComanda:imprimir',
                type: 'comanda',
                data,
                colaborador: socket_user,
                printerArea: data?.impresora?.nombre || data?.impresion_area?.nombre || 'COMANDA',
            })
            if (handledBySucursalPrinter) return

            const targetSocketId = Object.entries(socketUsers).find(
                ([key, value]) => value.id == `${data.sucursal}_pc_principal`,
            )?.[0]

            if (targetSocketId) {
                const localPath = 'comanda'
                const url = `http://localhost/imprimir/${localPath}.php`
                io.to(targetSocketId).emit('vComanda:imprimir', {
                    colaborador: socket_user,
                    url,
                    data,
                })
            } else {
                socket.emit('pc_principal_socket_not_found')
                console.log(`${data.sucursal}_pc_principal Socket user not fount.`)
            }
        })

        socket.on('vComanda:imprimirPrecuenta', async (data) => {
            const socket_user = socketUsers[socket.id]
            consoleLogSocket(socket_user, 'vComanda:imprimirPrecuenta')
            const sucursal_impresora_caja = obtenerSucursal(data.sucursal).impresora_caja
            data.impresora = sucursal_impresora_caja

            const handledBySucursalPrinter = await handleSucursalPrinterJob({
                event: 'vComanda:imprimirPrecuenta',
                type: 'precuenta',
                data,
                colaborador: socket_user,
                printerArea: 'CAJA',
            })
            if (handledBySucursalPrinter) return

            const targetSocketId = Object.entries(socketUsers).find(
                ([key, value]) => value.id == `${data.sucursal}_pc_principal`,
            )?.[0]

            if (targetSocketId) {
                const localPath = 'precuenta'
                const url = `http://localhost/imprimir/${localPath}.php`

                io.to(targetSocketId).emit('vComanda:imprimirPrecuenta', {
                    colaborador: socket_user,
                    url,
                    data,
                })
            } else {
                socket.emit('pc_principal_socket_not_found')
                console.log(`${data.sucursal}_pc_principal Socket user not fount.`)
            }
        })

        socket.on('vEmitirComprobante:imprimir', async (data) => {
            const socket_user = socketUsers[socket.id]
            consoleLogSocket(socket_user, 'vEmitirComprobante:imprimir')
            const sucursal_impresora_caja = obtenerSucursal(data.sucursal).impresora_caja
            data.impresora = sucursal_impresora_caja

            const handledBySucursalPrinter = await handleSucursalPrinterJob({
                event: 'vEmitirComprobante:imprimir',
                type: 'comprobante',
                data,
                colaborador: socket_user,
                printerArea: 'CAJA',
            })
            if (handledBySucursalPrinter) return

            const targetSocketId = Object.entries(socketUsers).find(
                ([key, value]) => value.id == `${data.sucursal}_pc_principal`,
            )?.[0]

            if (targetSocketId) {
                const localPath = 'comprobante'
                const url = `http://localhost/imprimir/${localPath}.php`
                io.to(targetSocketId).emit('vEmitirComprobante:imprimir', {
                    colaborador: socket_user,
                    url,
                    data,
                })
            } else {
                socket.emit('pc_principal_socket_not_found')
                console.log(`${data.sucursal}_pc_principal Socket user not fount.`)
            }
        })

        socket.on('vCajaAperturas:imprimirResumen', async (data) => {
            const socket_user = socketUsers[socket.id]
            consoleLogSocket(socket_user, 'vCajaAperturas:imprimirResumen')
            const sucursal_impresora_caja = obtenerSucursal(data.sucursal).impresora_caja
            data.impresora = sucursal_impresora_caja

            const handledBySucursalPrinter = await handleSucursalPrinterJob({
                event: 'vCajaAperturas:imprimirResumen',
                type: 'caja_resumen',
                data,
                colaborador: socket_user,
                printerArea: 'CAJA',
            })
            if (handledBySucursalPrinter) return

            const targetSocketId = Object.entries(socketUsers).find(
                ([key, value]) => value.id == `${data.sucursal}_pc_principal`,
            )?.[0]

            if (targetSocketId) {
                const localPath = 'caja_resumen'
                const url = `http://localhost/imprimir/${localPath}.php`
                io.to(targetSocketId).emit('vCajaAperturas:imprimirResumen', {
                    colaborador: socket_user,
                    url,
                    data,
                })
            } else {
                socket.emit('pc_principal_socket_not_found')
                console.log(`${data.subdominio}_pc_principal Socket user not fount.`)
            }
        })

        // --- Articulos --- //
        socket.on('mArticulo:crear', () => {
            const socket_user = socketUsers[socket.id]
            consoleLogSocket(socket_user, 'mArticulo:crear')
            io.to(socket_user.sucursal).emit('mArticulo:crear')
        })

        socket.on('mArticulo:modificar', () => {
            const socket_user = socketUsers[socket.id]
            consoleLogSocket(socket_user, 'mArticulo:modificar')
            io.to(socket_user.sucursal).emit('mArticulo:modificar')
        })

        // --- Categorias --- //
        socket.on('mArticuloCategoria:crear', () => {
            const socket_user = socketUsers[socket.id]
            consoleLogSocket(socket_user, 'mArticuloCategoria:crear')
            io.to(socket_user.sucursal).emit('mArticuloCategoria:crear')
        })

        socket.on('mArticuloCategoria:modificar', () => {
            const socket_user = socketUsers[socket.id]
            consoleLogSocket(socket_user, 'mArticuloCategoria:modificar')
            io.to(socket_user.sucursal).emit('mArticuloCategoria:modificar')
        })

        socket.on('disconnect', () => {
            if (socket.data.printerSucursal) {
                markSucursalPrinterOffline(socket.data.printerSucursal)
                if (printerSockets[socket.data.printerSucursal] === socket.id) {
                    delete printerSockets[socket.data.printerSucursal]
                }
                console.log('SocketIO: printer offline', {
                    sucursal: socket.data.printerSucursal,
                })
            }

            const socket_user = socketUsers[socket.id]
            consoleLogSocket(socket_user, '🔴 Usuario desconectado')
            delete socketUsers[socket.id]
        })
    })
}

export function getIO() {
    if (!io) {
        throw new Error('Socket.io no inicializado')
    }
    return io
}

export async function requestSucursalPrinters(sucursal) {
    const targetSocketId = printerSockets[sucursal]
    if (!targetSocketId) throw new Error('La PC principal de impresion no esta conectada')

    return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Tiempo de espera agotado')), 10000)

        io.to(targetSocketId).timeout(10000).emit('printer:list_printers', {}, (error, responses) => {
            clearTimeout(timeout)
            if (error) {
                reject(new Error('No se pudo obtener la lista de impresoras'))
                return
            }
            resolve(responses?.[0]?.printers || [])
        })
    })
}

function consoleLogSocket(socket_user, action) {
    console.log(`SocketIO: ${action}`, socket_user)
}

async function loadEmpresaClienteVarios(empresa_id) {
    const qry = {
        fltr: {
            nombres: { op: 'Es', val: 'CLIENTES VARIOS' },
            empresa: { op: 'Es', val: empresa_id },
        },
        cols: ['doc_tipo', 'doc_numero', 'doc_nombres', 'nombres'],
    }
    const clientes = await SocioRepository.find(qry, true)
    return clientes[0]
}

async function handleSucursalPrinterJob({ event, type, data, colaborador, printerArea }) {
    const routing = await createSocketPrintJob({ event, type, data, colaborador, printerArea })
    if (!routing.enabled || !routing.job) {
        console.log('SocketIO: printer agent not used', {
            event,
            sucursal: data?.sucursal,
            reason: routing.reason,
            printer_agent_enabled: routing.sucursal?.printer_agent_enabled,
            printer_status: routing.sucursal?.printer_status,
        })
        return false
    }

    console.log('SocketIO: printer job created', {
        event,
        job_id: routing.job.id,
        sucursal: data?.sucursal,
        printer_status: routing.sucursal?.printer_status,
    })
    const targetSocketId = printerSockets[data.sucursal]
    if (targetSocketId) {
        io.to(targetSocketId).emit('print_job:created', { jobId: routing.job.id })
        console.log('SocketIO: printer job sent to agent', {
            job_id: routing.job.id,
            sucursal: data?.sucursal,
            socket_id: targetSocketId,
        })
    } else {
        console.log('SocketIO: printer job saved as pending; agent offline', {
            job_id: routing.job.id,
            sucursal: data?.sucursal,
        })
    }

    return true
}

// io.to(socket_user.sucursal).emit("vComanda:crear", data) // A todos del room
// socket.to(empresa).emit("vComanda:crear", data) // A todos del room menos yo
// socket.emit("vComanda:crear", data) // Solo a mi
