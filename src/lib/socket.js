import { Server } from 'socket.io'

const userSockets = {}

export function initSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: '*'
        }
    })

    io.on("connection", (socket) => {
        console.log("🟢 Nuevo usuario conectado", socket.id)

        // El usuario debe unirse a una empresa (room)
        socket.on("joinEmpresa", ({ empresa, colaborador }) => {
            console.log(`🔗 Empresa ${empresa} User: ${colaborador} SoketId: ${socket.id}`)
            socket.join(empresa)
            userSockets[colaborador] = { empresa, colaborador, socketId: socket.id }
        })

        socket.on("vComanda:crear", ({ empresa, data }) => {
            consoleLogSocket(empresa, socket.id, "vComanda:crear")
            io.to(empresa).emit("vComanda:crear", data) // A todos del room
            // socket.to(empresa).emit("vComanda:crear", data) // A todos del room menos yo
            // socket.emit("vComanda:crear", data) // Solo a mi
        })

        socket.on("vComanda:addProductos", ({ empresa, data }) => {
            consoleLogSocket(empresa, socket.id, "vComanda:addProductos")
            io.to(empresa).emit("vComanda:addProductos", data)
        })

        socket.on("mPedidoDetalles:modificar", ({ empresa, data }) => {
            consoleLogSocket(empresa, socket.id, "mPedidoDetalles:modificar")
            io.to(empresa).emit("mPedidoDetalles:modificar", data)
        })

        socket.on("vPedidos:eliminar", ({ empresa, data }) => {
            consoleLogSocket(empresa, socket.id, "vPedidos:eliminar")
            io.to(empresa).emit("vPedidos:eliminar", data)
        })

        socket.on("vPedidos:anular", ({ empresa, data }) => {
            consoleLogSocket(empresa, socket.id, "vPedidos:anular")
            io.to(empresa).emit("vPedidos:anular", data)
        })

        socket.on("vPedidos:entregar", ({ empresa, data }) => {
            consoleLogSocket(empresa, socket.id, "vPedidos:entregar")
            io.to(empresa).emit("vPedidos:entregar", data)
        })

        socket.on("mCambiarMesa:cambiar", ({ empresa, data }) => {
            consoleLogSocket(empresa, socket.id, "mCambiarMesa:cambiar")
            io.to(empresa).emit("mCambiarMesa:cambiar", data)
        })

        socket.on("mMesasUnir:unir", ({ empresa, data }) => {
            consoleLogSocket(empresa, socket.id, "mMesasUnir:unir")
            io.to(empresa).emit("mMesasUnir:unir", data)
        })

        socket.on("vEmitirComprobante:grabar", ({ empresa, data }) => {
            consoleLogSocket(empresa, socket.id, "vEmitirComprobante:grabar")
            io.to(empresa).emit("vEmitirComprobante:grabar", data)
        })

        socket.on("vComanda:imprimir", ({ empresa, data }) => {
            consoleLogSocket(empresa, socket.id, "vComanda:imprimir")
            const targetSocketId = userSockets[`${data.subdominio}_pc_principal`]

            if (targetSocketId) {
                const encoded = encodeURIComponent(JSON.stringify(data))
                const localPath = 'comanda'
                const url = `http://localhost/imprimir/${localPath}.php?data=${encoded}`;
                io.to(targetSocketId.socketId).emit("vComanda:imprimir", url)
            }
            else {
                socket.emit('pc_principal_socket_not_found')
                console.log(`${data.subdominio}_pc_principal Socket user not fount.`)
            }
        })

        socket.on("vComanda:imprimirPrecuenta", ({ empresa, data }) => {
            consoleLogSocket(empresa, socket.id, "vComanda:imprimirPrecuenta")
            const targetSocketId = userSockets[`${data.subdominio}_pc_principal`]

            if (targetSocketId) {
                const encoded = encodeURIComponent(JSON.stringify(data))
                const localPath = 'precuenta'
                const url = `http://localhost/imprimir/${localPath}.php?data=${encoded}`;
                io.to(targetSocketId.socketId).emit("vComanda:imprimirPrecuenta", url)
            }
            else {
                socket.emit('pc_principal_socket_not_found')
                console.log(`${data.subdominio}_pc_principal Socket user not fount.`)
            }
        })

        socket.on("vEmitirComprobante:imprimir", ({ empresa, data }) => {
            consoleLogSocket(empresa, socket.id, "vEmitirComprobante:imprimir")
            const targetSocketId = userSockets[`${data.subdominio}_pc_principal`]

            if (targetSocketId) {
                const encoded = encodeURIComponent(JSON.stringify(data))
                const localPath = 'comprobante'
                const url = `http://localhost/imprimir/${localPath}.php?data=${encoded}`;
                io.to(targetSocketId.socketId).emit("vEmitirComprobante:imprimir", url)
                console.log('ASD')
            }
            else {
                socket.emit('pc_principal_socket_not_found')
                console.log(`${data.subdominio}_pc_principal Socket user not fount.`)
            }
        })

        socket.on("vCajaAperturas:imprimirResumen", ({ empresa, data }) => {
            consoleLogSocket(empresa, socket.id, "vCajaAperturas:imprimirResumen")
            const targetSocketId = userSockets[`${data.subdominio}_pc_principal`]

            if (targetSocketId) {
                const encoded = encodeURIComponent(JSON.stringify(data))
                const localPath = 'caja_resumen'
                const url = `http://localhost/imprimir/${localPath}.php?data=${encoded}`;
                io.to(targetSocketId.socketId).emit("vCajaAperturas:imprimirResumen", url)
            }
            else {
                socket.emit('pc_principal_socket_not_found')
                console.log(`${data.subdominio}_pc_principal Socket user not fount.`)
            }
        })

        socket.on("disconnect", () => {
            for (const [id, info] of Object.entries(userSockets)) {
                if (info.socketId === socket.id) {
                    delete userSockets[id]
                    break
                }
            }

            console.log("🔴 Cliente desconectado:", socket.id)
        })
    })
}

function consoleLogSocket(empresa, user, action) {
    console.log(`📡 Empresa: ${empresa} User: ${user} Action: ${action}`)
}