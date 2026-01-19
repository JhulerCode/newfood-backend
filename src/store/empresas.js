const empresasStore = new Map()

function obtenerEmpresa(id) {
    return empresasStore.get(id);
}

function guardarEmpresa(id, values) {
    empresasStore.set(id, values)
}

function borrarEmpresa(id) {
    empresasStore.delete(id)
}

function actualizarEmpresa(id, values) {
    const sesion = obtenerEmpresa(id)
    if (!sesion || !values) return

    Object.entries(values).forEach(([key, value]) => {
        // Evita asignar undefined (por ejemplo, si no se pasó la propiedad)
        if (value !== undefined) {
            sesion[key] = value
        }
    })
}

export {
    empresasStore,
    obtenerEmpresa,
    guardarEmpresa,
    borrarEmpresa,
    actualizarEmpresa,
}