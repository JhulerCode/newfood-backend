import { Server } from 'socket.io'

const socketUsers = {}

export function initSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: '*'
        }
    })

    io.on("connection", (socket) => {
        socket.on("joinEmpresa", ({ empresa, colaborador }) => {
            console.log(`🟢 Cliente conectado | Empresa: ${empresa.razon_social} | User: ${colaborador.nombres} ${colaborador.apellidos} | SoketId: ${socket.id}`)
            socket.join(empresa.id)
            socketUsers[socket.id] = { empresa, colaborador }
        })

        socket.on("vComanda:crear", (data) => {
            consoleLogSocket(socket.id, "vComanda:crear")
            const socket_user = socketUsers[socket.id]
            const { empresa } = socket_user
            io.to(empresa.id).emit("vComanda:crear", data)
        })

        socket.on("vComanda:addProductos", (data) => {
            consoleLogSocket(socket.id, "vComanda:addProductos")
            const socket_user = socketUsers[socket.id]
            const { empresa } = socket_user
            io.to(empresa.id).emit("vComanda:addProductos", data)
        })

        socket.on("mPedidoDetalles:modificar", (data) => {
            consoleLogSocket(socket.id, "mPedidoDetalles:modificar")
            const socket_user = socketUsers[socket.id]
            const { empresa } = socket_user
            io.to(empresa.id).emit("mPedidoDetalles:modificar", data)
        })

        socket.on("vPedidos:eliminar", (data) => {
            consoleLogSocket(socket.id, "vPedidos:eliminar")
            const socket_user = socketUsers[socket.id]
            const { empresa } = socket_user
            io.to(empresa.id).emit("vPedidos:eliminar", data)
        })

        socket.on("vPedidos:anular", (data) => {
            consoleLogSocket(socket.id, "vPedidos:anular")
            const socket_user = socketUsers[socket.id]
            const { empresa } = socket_user
            io.to(empresa.id).emit("vPedidos:anular", data)
        })

        socket.on("vPedidos:entregar", (data) => {
            consoleLogSocket(socket.id, "vPedidos:entregar")
            const socket_user = socketUsers[socket.id]
            const { empresa } = socket_user
            io.to(empresa.id).emit("vPedidos:entregar", data)
        })

        socket.on("mCambiarMesa:cambiar", (data) => {
            consoleLogSocket(socket.id, "mCambiarMesa:cambiar")
            const socket_user = socketUsers[socket.id]
            const { empresa } = socket_user
            io.to(empresa.id).emit("mCambiarMesa:cambiar", data)
        })

        socket.on("mMesasUnir:unir", () => {
            consoleLogSocket(socket.id, "mMesasUnir:unir")
            const socket_user = socketUsers[socket.id]
            const { empresa } = socket_user
            io.to(empresa.id).emit("mMesasUnir:unir")
        })

        socket.on("vEmitirComprobante:grabar", (data) => {
            consoleLogSocket(socket.id, "vEmitirComprobante:grabar")
            const socket_user = socketUsers[socket.id]
            const { empresa } = socket_user
            io.to(empresa.id).emit("vEmitirComprobante:grabar", data)
        })

        socket.on("vComanda:imprimir", (data) => {
            consoleLogSocket(socket.id, "vComanda:imprimir")
            // const targetSocketId = socketUsers[`${data.subdominio}_pc_principal`]

            const socket_user = socketUsers[socket.id]
            const { colaborador } = socket_user
            const targetSocketId = Object.entries(socketUsers).find(([key, value]) => value.colaborador.id == `${data.subdominio}_pc_principal`)?.[0]

            if (targetSocketId) {
                const encoded = encodeURIComponent(JSON.stringify(data))
                const localPath = 'comanda'
                const url = `http://localhost/imprimir/${localPath}.php?data=${encoded}`;
                io.to(targetSocketId).emit("vComanda:imprimir", { colaborador, url })
            }
            else {
                socket.emit('pc_principal_socket_not_found')
                console.log(`${data.subdominio}_pc_principal Socket user not fount.`)
            }
        })

        socket.on("vComanda:imprimirPrecuenta", (data) => {
            consoleLogSocket(socket.id, "vComanda:imprimirPrecuenta")
            // const targetSocketId = socketUsers[`${data.subdominio}_pc_principal`]

            const socket_user = socketUsers[socket.id]
            const { colaborador } = socket_user
            const targetSocketId = Object.entries(socketUsers).find(([key, value]) => value.colaborador.id == `${data.subdominio}_pc_principal`)?.[0]

            if (targetSocketId) {
                const encoded = encodeURIComponent(JSON.stringify(data))
                const localPath = 'precuenta'
                const url = `http://localhost/imprimir/${localPath}.php?data=${encoded}`;
                io.to(targetSocketId).emit("vComanda:imprimirPrecuenta", { colaborador, url })
            }
            else {
                socket.emit('pc_principal_socket_not_found')
                console.log(`${data.subdominio}_pc_principal Socket user not fount.`)
            }
        })

        socket.on("vEmitirComprobante:imprimir", (data) => {
            consoleLogSocket(socket.id, "vEmitirComprobante:imprimir")
            // const targetSocketId = socketUsers[`${data.subdominio}_pc_principal`]

            const socket_user = socketUsers[socket.id]
            const { colaborador } = socket_user
            const targetSocketId = Object.entries(socketUsers).find(([key, value]) => value.colaborador.id == `${data.subdominio}_pc_principal`)?.[0]

            if (targetSocketId) {
                const encoded = encodeURIComponent(JSON.stringify(data))
                const localPath = 'comprobante'
                const url = `http://localhost/imprimir/${localPath}.php?data=${encoded}`;
                io.to(targetSocketId).emit("vEmitirComprobante:imprimir", { colaborador, url })
            }
            else {
                socket.emit('pc_principal_socket_not_found')
                console.log(`${data.subdominio}_pc_principal Socket user not fount.`)
            }
        })

        socket.on("vCajaAperturas:imprimirResumen", (data) => {
            consoleLogSocket(socket.id, "vCajaAperturas:imprimirResumen")

            const socket_user = socketUsers[socket.id]
            const { colaborador } = socket_user
            const targetSocketId = Object.entries(socketUsers).find(([key, value]) => value.colaborador.id == `${data.subdominio}_pc_principal`)?.[0]

            if (targetSocketId) {
                const encoded = encodeURIComponent(JSON.stringify(data))
                const localPath = 'caja_resumen'
                const url = `http://localhost/imprimir/${localPath}.php?data=${encoded}`;
                io.to(targetSocketId).emit("vCajaAperturas:imprimirResumen", { colaborador, url })
            }
            else {
                socket.emit('pc_principal_socket_not_found')
                console.log(`${data.subdominio}_pc_principal Socket user not fount.`)
            }
        })

        socket.on("disconnect", () => {
            const socket_user = socketUsers[socket.id]
            const { empresa, colaborador } = socket_user
            console.log(`🔴 Cliente desconectado | Empresa: ${empresa.razon_social} | User: ${colaborador.nombres} ${colaborador.apellidos} | SoketId: ${socket.id}`)
            delete socketUsers[socket.id]
        })
    })
}

function consoleLogSocket(socketId, action) {
    const socket_user = socketUsers[socketId]
    const { empresa, colaborador } = socket_user
    console.log(`📡 Empresa: ${empresa.razon_social} | User: ${colaborador.nombres} ${colaborador.apellidos} | Action: ${action}`)
}


// io.to(empresa.id).emit("vComanda:crear", data) // A todos del room
// socket.to(empresa).emit("vComanda:crear", data) // A todos del room menos yo
// socket.emit("vComanda:crear", data) // Solo a mi