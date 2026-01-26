import { Server } from 'socket.io'
import { obtenerEmpresa } from '#store/empresas.js'

let io = null
const socketUsers = {}

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
        socket.on('joinUser', async (colaborador) => {
            const empresa = await obtenerEmpresa(colaborador.empresa)

            if (empresa) {
                const to_save = {
                    ...colaborador,
                    empresa_nombre: empresa.razon_social,
                    sucursal_codigo: empresa.sucursales.find((s) => s.id == colaborador.sucursal)
                        ?.codigo,
                    socket_id: socket.id,
                }
                console.log(`🟢 Usuario conectado`, to_save)
                socket.join(colaborador.sucursal)
                socketUsers[socket.id] = to_save
            } else {
                console.log(`🔴 Usuario no conectado | Empresa: ${colaborador.empresa}`)
            }
        })

        // --- Pedidos --- //
        socket.on('vComanda:crear', (data) => {
            consoleLogSocket(socket.id, 'vComanda:crear')
            const socket_user = socketUsers[socket.id]
            const { empresa } = socket_user
            io.to(empresa.id).emit('vComanda:crear', data)
        })

        socket.on('vComanda:editar', (data) => {
            consoleLogSocket(socket.id, 'vComanda:editar')
            const socket_user = socketUsers[socket.id]
            const { empresa } = socket_user
            io.to(empresa.id).emit('vComanda:editar', data)
        })

        socket.on('vComanda:addProductos', (data) => {
            consoleLogSocket(socket.id, 'vComanda:addProductos')
            const socket_user = socketUsers[socket.id]
            const { empresa } = socket_user
            io.to(empresa.id).emit('vComanda:addProductos', data)
        })

        socket.on('mPedidoDetalles:modificar', (data) => {
            consoleLogSocket(socket.id, 'mPedidoDetalles:modificar')
            const socket_user = socketUsers[socket.id]
            const { empresa } = socket_user
            io.to(empresa.id).emit('mPedidoDetalles:modificar', data)
        })

        socket.on('vPedidos:eliminar', (data) => {
            consoleLogSocket(socket.id, 'vPedidos:eliminar')
            const socket_user = socketUsers[socket.id]
            const { empresa } = socket_user
            io.to(empresa.id).emit('vPedidos:eliminar', data)
        })

        socket.on('vPedidos:anular', (data) => {
            consoleLogSocket(socket.id, 'vPedidos:anular')
            const socket_user = socketUsers[socket.id]
            const { empresa } = socket_user
            io.to(empresa.id).emit('vPedidos:anular', data)
        })

        socket.on('vPedidos:entregar', (data) => {
            consoleLogSocket(socket.id, 'vPedidos:entregar')
            const socket_user = socketUsers[socket.id]
            const { empresa } = socket_user
            io.to(empresa.id).emit('vPedidos:entregar', data)
        })

        socket.on('vPedidos:entregarBulk', (data) => {
            consoleLogSocket(socket.id, 'vPedidos:entregarBulk')
            const socket_user = socketUsers[socket.id]
            const { empresa } = socket_user
            io.to(empresa.id).emit('vPedidos:entregarBulk', data)
        })

        socket.on('mCambiarMesa:cambiar', (data) => {
            consoleLogSocket(socket.id, 'mCambiarMesa:cambiar')
            const socket_user = socketUsers[socket.id]
            const { empresa } = socket_user
            io.to(empresa.id).emit('mCambiarMesa:cambiar', data)
        })

        socket.on('mMesasUnir:unir', () => {
            consoleLogSocket(socket.id, 'mMesasUnir:unir')
            const socket_user = socketUsers[socket.id]
            const { empresa } = socket_user
            io.to(empresa.id).emit('mMesasUnir:unir')
        })

        socket.on('vEmitirComprobante:grabar', (data) => {
            consoleLogSocket(socket.id, 'vEmitirComprobante:grabar')
            const socket_user = socketUsers[socket.id]
            const { empresa } = socket_user
            io.to(empresa.id).emit('vEmitirComprobante:grabar', data)
        })

        socket.on('vComanda:imprimir', (data) => {
            consoleLogSocket(socket.id, 'vComanda:imprimir')

            const socket_user = socketUsers[socket.id]
            const { colaborador } = socket_user
            const targetSocketId = Object.entries(socketUsers).find(
                ([key, value]) => value.colaborador.id == `${data.sucursal}_pc_principal`,
            )?.[0]

            if (targetSocketId) {
                const localPath = 'comanda'
                const url = `http://localhost/imprimir/${localPath}.php`
                io.to(targetSocketId).emit('vComanda:imprimir', { colaborador, url, data })
            } else {
                socket.emit('pc_principal_socket_not_found')
                console.log(`${data.sucursal}_pc_principal Socket user not fount.`)
            }
        })

        socket.on('vComanda:imprimirPrecuenta', (data) => {
            consoleLogSocket(socket.id, 'vComanda:imprimirPrecuenta')

            const socket_user = socketUsers[socket.id]
            const { colaborador } = socket_user
            const targetSocketId = Object.entries(socketUsers).find(
                ([key, value]) => value.colaborador.id == `${data.sucursal}_pc_principal`,
            )?.[0]

            if (targetSocketId) {
                const localPath = 'precuenta'
                const url = `http://localhost/imprimir/${localPath}.php`
                io.to(targetSocketId).emit('vComanda:imprimirPrecuenta', { colaborador, url, data })
            } else {
                socket.emit('pc_principal_socket_not_found')
                console.log(`${data.sucursal}_pc_principal Socket user not fount.`)
            }
        })

        socket.on('vEmitirComprobante:imprimir', (data) => {
            consoleLogSocket(socket.id, 'vEmitirComprobante:imprimir')

            const socket_user = socketUsers[socket.id]
            const { colaborador } = socket_user
            const targetSocketId = Object.entries(socketUsers).find(
                ([key, value]) => value.colaborador.id == `${data.sucursal}_pc_principal`,
            )?.[0]

            if (targetSocketId) {
                const localPath = 'comprobante'
                const url = `http://localhost/imprimir/${localPath}.php`
                io.to(targetSocketId).emit('vEmitirComprobante:imprimir', {
                    colaborador,
                    url,
                    data,
                })
            } else {
                socket.emit('pc_principal_socket_not_found')
                console.log(`${data.sucursal}_pc_principal Socket user not fount.`)
            }
        })

        socket.on('vCajaAperturas:imprimirResumen', (data) => {
            consoleLogSocket(socket.id, 'vCajaAperturas:imprimirResumen')

            const socket_user = socketUsers[socket.id]
            const { colaborador } = socket_user
            const targetSocketId = Object.entries(socketUsers).find(
                ([key, value]) => value.colaborador.id == `${data.subdominio}_pc_principal`,
            )?.[0]

            if (targetSocketId) {
                const localPath = 'caja_resumen'
                const url = `http://localhost/imprimir/${localPath}.php`
                io.to(targetSocketId).emit('vCajaAperturas:imprimirResumen', {
                    colaborador,
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
            consoleLogSocket(socket.id, 'mArticulo:crear')
            const socket_user = socketUsers[socket.id]
            const { empresa } = socket_user
            io.to(empresa.id).emit('mArticulo:crear')
        })

        socket.on('mArticulo:modificar', () => {
            consoleLogSocket(socket.id, 'mArticulo:modificar')
            const socket_user = socketUsers[socket.id]
            const { empresa } = socket_user
            io.to(empresa.id).emit('mArticulo:modificar')
        })

        // --- Categorias --- //
        socket.on('mArticuloCategoria:crear', () => {
            consoleLogSocket(socket.id, 'mArticuloCategoria:crear')
            const socket_user = socketUsers[socket.id]
            const { empresa } = socket_user
            io.to(empresa.id).emit('mArticuloCategoria:crear')
        })

        socket.on('mArticuloCategoria:modificar', () => {
            consoleLogSocket(socket.id, 'mArticuloCategoria:modificar')
            const socket_user = socketUsers[socket.id]
            const { empresa } = socket_user
            io.to(empresa.id).emit('mArticuloCategoria:modificar')
        })

        socket.on('disconnect', () => {
            const socket_user = socketUsers[socket.id]
            // const { empresa, colaborador } = socket_user
            console.log(
                // `🔴 Usuario desconectado | Empresa: ${empresa.razon_social} | User: ${colaborador.nombres} ${colaborador.apellidos} | SoketId: ${socket.id}`,
                '🔴 Usuario desconectado',
                socket_user,
            )
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

function consoleLogSocket(socketId, action) {
    const socket_user = socketUsers[socketId]
    const { empresa, colaborador } = socket_user
    console.log(
        `📡 Empresa: ${empresa.razon_social} | User: ${colaborador.nombres} ${colaborador.apellidos} | Action: ${action}`,
    )
}

// io.to(empresa.id).emit("vComanda:crear", data) // A todos del room
// socket.to(empresa).emit("vComanda:crear", data) // A todos del room menos yo
// socket.emit("vComanda:crear", data) // Solo a mi
