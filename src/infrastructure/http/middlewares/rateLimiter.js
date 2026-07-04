import { rateLimit } from 'express-rate-limit'

// Limitador estricto para rutas de auth
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    limit: 10, // Limitar cada IP a 10 peticiones por ventana de 15 minutos
    message: { msg: 'Demasiados intentos de autenticación, inténtalo de nuevo más tarde.' },
    standardHeaders: true, // Devuelve cabeceras RateLimit-*
    legacyHeaders: false, // Desactiva cabeceras X-RateLimit-*
})
