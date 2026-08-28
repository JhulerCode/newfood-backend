import { config } from 'dotenv'

config()

function withoutTrailingSlash(value) {
    return value.replace(/\/+$/, '')
}

export default {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: Number(process.env.PORT) || 3000,
    hostFrontend: process.env.HOST_FRONTEND || '',
    frontendAllowedDomains: process.env.FRONTEND_ALLOWED_DOMAINS || '',
    frontendAllowedOrigins: process.env.FRONTEND_ALLOWED_ORIGINS || '',
    APP_VERSION: process.env.APP_VERSION || '',
    tokenMyApi: process.env.TOKEN_MY_API || '',
    dbUri: process.env.DB_URI || '',

    REDIS_URI: process.env.REDIS_URI || '',
    REDIS_KEY_PREFIX: process.env.REDIS_KEY_PREFIX || '',

    MINIO_DOMAIN: process.env.MINIO_DOMAIN || '',
    MINIO_USER: process.env.MINIO_USER || '',
    MINIO_PASSWORD: process.env.MINIO_PASSWORD || '',
    MINIO_BUCKET: process.env.MINIO_BUCKET || '',

    R2_ENDPOINT: process.env.R2_ENDPOINT || '',
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || '',
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || '',
    R2_BUCKET: process.env.R2_BUCKET || '',
    R2_PUBLIC_DOMAIN: process.env.R2_PUBLIC_DOMAIN || '',

    decolectaApiKey: process.env.DECOLECTA_API_KEY || '',
    resendApiKey: process.env.RESEND_API_KEY || '',
    mifactApiKey: process.env.MIFACT_API_KEY || '',

    appName: process.env.APP_NAME || '',
    publicAppUrl: withoutTrailingSlash(process.env.PUBLIC_APP_URL || ''),
    publicApiUrl: withoutTrailingSlash(process.env.PUBLIC_API_URL || ''),
    mailFromName: process.env.MAIL_FROM_NAME || '',
    mailFromAddress: process.env.MAIL_FROM_ADDRESS || '',
    supportName: process.env.SUPPORT_NAME || '',
    supportEmail: process.env.SUPPORT_EMAIL || '',
    supportWhatsapp: process.env.SUPPORT_WHATSAPP || '',
    whatsappApiUrl: withoutTrailingSlash(process.env.WHATSAPP_API_URL || ''),
    whatsappApiKey: process.env.WHATSAPP_API_KEY || '',
    whatsappMessageSignature: process.env.WHATSAPP_MESSAGE_SIGNATURE || '',
}
