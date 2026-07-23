import { config } from 'dotenv'

config()

export default {
    NODE_ENV: process.env.NODE_ENV || 'development',
    hostFrontend: process.env.HOST_FRONTEND || '',
    APP_VERSION: process.env.APP_VERSION || '',
    tokenMyApi: process.env.TOKEN_MY_API || '',
    dbUri: process.env.DB_URI || '',

    REDIS_URI: process.env.REDIS_URI || '',

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
}
