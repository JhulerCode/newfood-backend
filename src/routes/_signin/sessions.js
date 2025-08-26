const sessionStore = new Map();

function guardarSesion(userId, sessionData) {
    sessionStore.set(userId, sessionData)
    // console.log(sessionStore)
}

function obtenerSesion(userId) {
    return sessionStore.get(userId);
}

function borrarSesion(userId) {
    sessionStore.delete(userId)
    // console.log(sessionStore)
}

function actualizarSesion(id, values) {
    const sesion = obtenerSesion(id)
    
    if (sesion) {
        if (values.nombres) sesion.nombres = values.nombres
        if (values.apellidos) sesion.apellidos = values.apellidos
        if (values.cargo) sesion.cargo = values.cargo
        if (values.vista_inicial) sesion.vista_inicial = values.vista_inicial
        if (values.theme) sesion.theme = values.theme
        if (values.color) sesion.color = values.color
        if (values.format_date) sesion.format_date = values.format_date
        if (values.menu_visible != null) sesion.menu_visible = values.menu_visible
        if (values.permisos) sesion.permisos = values.permisos
    }
}

// function limpiarSesionesExpiradas() {
//     const ahora = Math.floor(Date.now() / 1000); // en segundos
//     for (const [userId, sesion] of sessionStore.entries()) {
//         if (sesion.exp < ahora) {
//             sessionStore.delete(userId);
//         }
//     }
// }

// Ejecutar cada 5 minutos
// setInterval(limpiarSesionesExpiradas, 5 * 60 * 1000);

export {
    sessionStore,
    guardarSesion,
    obtenerSesion,
    borrarSesion,
    actualizarSesion,
}