import { getIO } from '#infrastructure/socket.js'
import { EmpresaRepository } from '#db/repositories.js'

const empresasStore = new Map()

async function obtenerEmpresa(id) {
    let empresa = empresasStore.get(id)

    if (!empresa) {
        const qry = {
            id,
            incl: ['sucursales'],
        }

        empresa = await EmpresaRepository.find(qry, true)

        guardarEmpresa(empresa.id, empresa)
    }

    return empresa
}

function guardarEmpresa(id, values) {
    empresasStore.set(id, values)
}

function borrarEmpresa(id) {
    empresasStore.delete(id)
}

async function actualizarEmpresa(id, values) {
    const empresa = await obtenerEmpresa(id)
    if (!empresa || !values) return

    Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined) {
            empresa[key] = value
        }
    })

    console.log(`📡 Empresa: ${values.razon_social} | Action: empresa updated`)
    getIO().to(id).emit('empresa-updated', await obtenerEmpresa(id))
}

export { empresasStore, obtenerEmpresa, guardarEmpresa, borrarEmpresa, actualizarEmpresa }
