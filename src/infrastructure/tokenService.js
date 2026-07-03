import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import config from '../config.js'

const ACCESS_TOKEN_COOKIE = 'access_token'
const REFRESH_TOKEN_COOKIE = 'refresh_token'
const ACCESS_TOKEN_EXPIRES_IN = '15m'
const REFRESH_TOKEN_EXPIRES_IN = '30d'
const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000

function createSessionId() {
    return crypto.randomUUID()
}

function createRefreshTokenId() {
    return crypto.randomUUID()
}

function createAccessToken({ session_id, colaborador_id }) {
    return jwt.sign(
        {
            type: 'access',
            session_id,
            colaborador_id,
        },
        config.tokenMyApi,
        { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
    )
}

function createRefreshToken({ session_id, colaborador_id, refresh_token_id }) {
    return jwt.sign(
        {
            type: 'refresh',
            session_id,
            colaborador_id,
            refresh_token_id,
        },
        config.tokenMyApi,
        { expiresIn: REFRESH_TOKEN_EXPIRES_IN },
    )
}

function verifyAccessToken(token) {
    const payload = jwt.verify(token, config.tokenMyApi)
    if (payload.type !== 'access') throw new Error('Token de acceso no valido')
    return payload
}

function verifyRefreshToken(token) {
    const payload = jwt.verify(token, config.tokenMyApi)
    if (payload.type !== 'refresh') throw new Error('Token de refresco no valido')
    return payload
}

function getCookieOptions(max_age) {
    const is_production = process.env.NODE_ENV === 'production'

    return {
        httpOnly: true,
        sameSite: 'none',
        secure: is_production,
        maxAge: max_age,
        path: '/',
    }
}

function setAuthCookies(res, { access_token, refresh_token }) {
    res.cookie(ACCESS_TOKEN_COOKIE, access_token, getCookieOptions(ACCESS_TOKEN_MAX_AGE))
    res.cookie(REFRESH_TOKEN_COOKIE, refresh_token, getCookieOptions(REFRESH_TOKEN_MAX_AGE))
}

function setAccessCookie(res, access_token) {
    res.cookie(ACCESS_TOKEN_COOKIE, access_token, getCookieOptions(ACCESS_TOKEN_MAX_AGE))
}

function clearAuthCookies(res) {
    const options = getCookieOptions(0)

    res.clearCookie(ACCESS_TOKEN_COOKIE, options)
    res.clearCookie(REFRESH_TOKEN_COOKIE, options)
}

export {
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
    createSessionId,
    createRefreshTokenId,
    createAccessToken,
    createRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    setAuthCookies,
    setAccessCookie,
    clearAuthCookies,
}
