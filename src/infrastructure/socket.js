import { Server } from 'socket.io'
import { obtenerEmpresa, guardarEmpresa } from '#store/empresas.js'
import {
    sucursalesStore,
    obtenerSucursal,
    guardarSucursal,
    actualizarSucursal,
} from '#store/sucursales.js'
import { ImpresionAreaRepository, EmpresaRepository, SucursalRepository } from '#db/repositories.js'

let io = null
const socketUsers = {}

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
        socket.on('joinPcPrincipal', async (colaborador) => {
            let empresa = obtenerEmpresa(colaborador.empresa)

            if (!empresa) {
                const qry = {
                    id: colaborador.empresa,
                    incl: ['sucursales'],
                }

                empresa = await EmpresaRepository.find(qry, true)

                guardarEmpresa(colaborador.empresa, empresa)
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
                console.log(sucursalesStore)
                let sucursal = obtenerSucursal(colaborador.sucursal)

                if (!sucursal) {
                    sucursal = await SucursalRepository.find({ id: colaborador.sucursal }, true)
                    sucursal = guardarSucursal(colaborador.sucursal, sucursal)
                }

                console.log(sucursalesStore)

                if (!sucursal.impresora_caja) {
                    const impresora_caja = await loadSucursalImpresoraCaja(colaborador.sucursal)
                    actualizarSucursal(colaborador.sucursal, { impresora_caja })
                }

                console.log(sucursalesStore)
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

        socket.on('vComanda:imprimir', (data) => {
            const socket_user = socketUsers[socket.id]
            consoleLogSocket(socket_user, 'vComanda:imprimir')

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

        socket.on('vComanda:imprimirPrecuenta', (data) => {
            const socket_user = socketUsers[socket.id]
            consoleLogSocket(socket_user, 'vComanda:imprimirPrecuenta')

            const targetSocketId = Object.entries(socketUsers).find(
                ([key, value]) => value.id == `${data.sucursal}_pc_principal`,
            )?.[0]

            if (targetSocketId) {
                const localPath = 'precuenta'
                const url = `http://localhost/imprimir/${localPath}.php`
                const sucursal_impresora_caja = obtenerSucursal(data.sucursal).impresora_caja
                data.impresora = sucursal_impresora_caja
                console.log(data)
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

        socket.on('vEmitirComprobante:imprimir', (data) => {
            const socket_user = socketUsers[socket.id]
            consoleLogSocket(socket_user, 'vEmitirComprobante:imprimir')

            const targetSocketId = Object.entries(socketUsers).find(
                ([key, value]) => value.id == `${data.sucursal}_pc_principal`,
            )?.[0]

            if (targetSocketId) {
                const localPath = 'comprobante'
                const url = `http://localhost/imprimir/${localPath}.php`
                const sucursal_impresora_caja = obtenerSucursal(data.sucursal).impresora_caja
                data.impresora = sucursal_impresora_caja
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

        socket.on('vCajaAperturas:imprimirResumen', (data) => {
            const socket_user = socketUsers[socket.id]
            consoleLogSocket(socket_user, 'vCajaAperturas:imprimirResumen')

            const targetSocketId = Object.entries(socketUsers).find(
                ([key, value]) => value.id == `${data.sucursal}_pc_principal`,
            )?.[0]

            if (targetSocketId) {
                const localPath = 'caja_resumen'
                const url = `http://localhost/imprimir/${localPath}.php`
                const sucursal_impresora_caja = obtenerSucursal(data.sucursal).impresora_caja
                data.impresora = sucursal_impresora_caja
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

function consoleLogSocket(socket_user, action) {
    console.log(`SocketIO: ${action}`, socket_user)
}

// io.to(socket_user.sucursal).emit("vComanda:crear", data) // A todos del room
// socket.to(empresa).emit("vComanda:crear", data) // A todos del room menos yo
// socket.emit("vComanda:crear", data) // Solo a mi
